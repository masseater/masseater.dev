import { Match, Option, Predicate, Result, String as Str, pipe } from "effect";

import type { RepositoryUses, Uses } from "#/features/audit-workflows/model/common.ts";
import type { RemoteUrl } from "#/features/audit-workflows/model/pre-commit.ts";

export type UsesPattern =
  | {
      readonly type: "exact-with-ref";
      readonly owner: string;
      readonly repo: string;
      readonly subpath: Option.Option<string>;
      readonly gitRef: string;
    }
  | {
      readonly type: "exact-path";
      readonly owner: string;
      readonly repo: string;
      readonly subpath: string;
    }
  | { readonly type: "exact-repo"; readonly owner: string; readonly repo: string }
  | { readonly type: "in-repo"; readonly owner: string; readonly repo: string }
  | { readonly type: "in-owner"; readonly owner: string }
  | { readonly type: "any" };

export interface Slug {
  readonly owner: string;
  readonly repo: string;
  readonly full: string;
}

export type RepoRef =
  | { readonly type: "uses"; readonly uses: RepositoryUses }
  | { readonly type: "url"; readonly slug: Option.Option<Slug>; readonly gitRef: string };

const PATTERN =
  /^(?<owner>[\p{L}\p{N}_-]+)\/(?<repo>[\p{L}\p{N}_.-]+|\*)(?:\/(?<subpath>(?:(?![@*])[!-~])+|\*))?(?:@(?<ref>(?:(?!\*)[!-~])+))?$/iu;
export const COMMIT = /^[0-9a-fA-F]{40}$/u;
const RANKS: readonly UsesPattern["type"][] = [
  "exact-with-ref",
  "exact-path",
  "exact-repo",
  "in-repo",
  "in-owner",
  "any",
];
const GIT_SUFFIX = ".git";
const URL_PARTS = 3;
const LEADING_SLASH = 1;
const START = 0;

const same = (left: string, right: string): boolean =>
  Str.toLowerCase(left) === Str.toLowerCase(right);

type Groups = Readonly<Record<string, string | undefined>>;

const groupsOf = (text: string): Option.Option<Groups> =>
  pipe(
    Option.fromNullishOr(PATTERN.exec(text)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
  );

const isInvalid = (
  repo: string,
  subpath: Option.Option<string>,
  gitRef: Option.Option<string>,
): boolean =>
  (repo === "*" && Option.isSome(subpath)) ||
  (Option.contains(subpath, "*") && Option.isSome(gitRef));

const bareRepo = (owner: string, repo: string): UsesPattern => {
  if (repo === "*") {
    return { type: "in-owner", owner };
  }
  return { type: "exact-repo", owner, repo };
};

const patternOf =
  (text: string) =>
  (groups: Groups): Result.Result<UsesPattern, string> => {
    const { owner = "", repo = "" } = groups;
    const subpath = Option.fromNullishOr(groups["subpath"]);
    const gitRef = Option.fromNullishOr(groups["ref"]);
    if (Option.isNone(subpath) && Option.isNone(gitRef)) {
      return Result.succeed(bareRepo(owner, repo));
    }
    if (isInvalid(repo, subpath, gitRef)) {
      return Result.fail(`invalid pattern: ${text}`);
    }
    if (Option.contains(subpath, "*")) {
      return Result.succeed({ type: "in-repo", owner, repo });
    }
    return Option.match(gitRef, {
      onNone: () =>
        Result.succeed({
          type: "exact-path",
          owner,
          repo,
          subpath: Option.getOrElse(subpath, () => ""),
        }),
      onSome: (ref) =>
        Result.succeed({ type: "exact-with-ref", owner, repo, subpath, gitRef: ref }),
    });
  };

export const parsePattern = (text: string): Result.Result<UsesPattern, string> => {
  if (text === "*") {
    return Result.succeed({ type: "any" });
  }
  return pipe(
    groupsOf(text),
    Result.fromOption(() => `invalid pattern: ${text}`),
    Result.flatMap(patternOf(text)),
  );
};

export const displayPattern: (pattern: UsesPattern) => string = Match.type<UsesPattern>().pipe(
  Match.discriminatorsExhaustive("type")({
    any: () => "*",
    "in-owner": (pattern) => `${pattern.owner}/*`,
    "in-repo": (pattern) => `${pattern.owner}/${pattern.repo}/*`,
    "exact-repo": (pattern) => `${pattern.owner}/${pattern.repo}`,
    "exact-path": (pattern) => `${pattern.owner}/${pattern.repo}/${pattern.subpath}`,
    "exact-with-ref": (pattern) =>
      Option.match(pattern.subpath, {
        onNone: () => `${pattern.owner}/${pattern.repo}@${pattern.gitRef}`,
        onSome: (subpath) => `${pattern.owner}/${pattern.repo}/${subpath}@${pattern.gitRef}`,
      }),
  }),
);

const fieldsOf: (pattern: UsesPattern) => readonly string[] = Match.type<UsesPattern>().pipe(
  Match.discriminatorsExhaustive("type")({
    any: () => [],
    "in-owner": (pattern) => [pattern.owner],
    "in-repo": (pattern) => [pattern.owner, pattern.repo],
    "exact-repo": (pattern) => [pattern.owner, pattern.repo],
    "exact-path": (pattern) => [pattern.owner, pattern.repo, pattern.subpath],
    "exact-with-ref": (pattern) => [
      pattern.owner,
      pattern.repo,
      Option.getOrElse(pattern.subpath, () => ""),
      pattern.gitRef,
    ],
  }),
);

export const patternKey = (pattern: UsesPattern): readonly [number, readonly string[]] => [
  RANKS.indexOf(pattern.type),
  fieldsOf(pattern),
];

const sameRepo = (
  left: { readonly owner: string; readonly repo: string },
  right: { readonly owner: string; readonly repo: string },
): boolean => same(left.owner, right.owner) && same(left.repo, right.repo);

const subpathEquals = Option.makeEquivalence(Str.Equivalence);

const matchesUses = (uses: RepositoryUses): ((pattern: UsesPattern) => boolean) =>
  Match.type<UsesPattern>().pipe(
    Match.discriminatorsExhaustive("type")({
      "exact-with-ref": (pattern) =>
        sameRepo(uses, pattern) &&
        subpathEquals(uses.subpath, pattern.subpath) &&
        uses.gitRef === pattern.gitRef,
      "exact-path": (pattern) =>
        sameRepo(uses, pattern) && Option.contains(uses.subpath, pattern.subpath),
      "exact-repo": (pattern) => sameRepo(uses, pattern) && Option.isNone(uses.subpath),
      "in-repo": (pattern) => sameRepo(uses, pattern),
      "in-owner": (pattern) => same(uses.owner, pattern.owner),
      any: () => true,
    }),
  );

const matchesSlug = (slug: Slug, gitRef: string): ((pattern: UsesPattern) => boolean) =>
  Match.type<UsesPattern>().pipe(
    Match.discriminatorsExhaustive("type")({
      "exact-with-ref": (pattern) =>
        Option.isNone(pattern.subpath) && sameRepo(slug, pattern) && gitRef === pattern.gitRef,
      "exact-path": () => false,
      "exact-repo": (pattern) => sameRepo(slug, pattern),
      "in-repo": (pattern) => sameRepo(slug, pattern),
      "in-owner": (pattern) => same(slug.owner, pattern.owner),
      any: () => true,
    }),
  );

export const patternMatches =
  (pattern: UsesPattern) =>
  (ref: RepoRef): boolean => {
    if (ref.type === "uses") {
      return matchesUses(ref.uses)(pattern);
    }
    return pipe(
      ref.slug,
      Option.exists((slug) => matchesSlug(slug, ref.gitRef)(pattern)),
    );
  };

export const usesRef = (uses: RepositoryUses): RepoRef => ({ type: "uses", uses });

const withoutGitSuffix = (pathname: string): string => {
  if (Str.endsWith(GIT_SUFFIX)(pathname)) {
    return Str.slice(START, pathname.length - GIT_SUFFIX.length)(pathname);
  }
  return pathname;
};

const slugOf = (path: string): Option.Option<Slug> => {
  const parts = Str.split("/")(path);
  const [empty, owner, repo] = parts;
  if (
    parts.length !== URL_PARTS ||
    empty !== "" ||
    !Predicate.isString(owner) ||
    !Predicate.isString(repo)
  ) {
    return Option.none();
  }
  return Option.liftPredicate(
    { owner, repo, full: Str.slice(LEADING_SLASH)(path) },
    () => Str.isNonEmpty(owner) && Str.isNonEmpty(repo),
  );
};

export const urlRef =
  (url: RemoteUrl) =>
  (gitRef: string): RepoRef => {
    if (url.hostname !== "github.com") {
      return { type: "url", slug: Option.none(), gitRef };
    }
    const path = withoutGitSuffix(url.pathname);
    return { type: "url", slug: slugOf(path), gitRef };
  };

export const refGitRef = (ref: RepoRef): string => {
  if (ref.type === "uses") {
    return ref.uses.gitRef;
  }
  return ref.gitRef;
};

export const refSlug = (ref: RepoRef): Option.Option<Slug> => {
  if (ref.type === "uses") {
    return Option.some({ owner: ref.uses.owner, repo: ref.uses.repo, full: ref.uses.slug });
  }
  return ref.slug;
};

export const commitRef = (ref: RepoRef): Option.Option<string> =>
  Option.liftPredicate(refGitRef(ref), (each) => COMMIT.test(each));

export const symbolicRef = (ref: RepoRef): Option.Option<string> =>
  Option.liftPredicate(refGitRef(ref), (each) => !COMMIT.test(each));

export const repoMatches =
  (template: string) =>
  (ref: RepoRef): boolean =>
    pipe(
      Result.getSuccess(parsePattern(template)),
      Option.exists((pattern) => patternMatches(pattern)(ref)),
    );

export const usesMatches =
  (template: string) =>
  (uses: RepositoryUses): boolean =>
    repoMatches(template)(usesRef(uses));

export const isUnpinned = (uses: Uses): boolean => {
  if (uses.type === "docker") {
    return Option.isNone(uses.hash) && Option.isNone(uses.tag);
  }
  return uses.type === "local";
};

export const isUnhashed = (uses: Uses): boolean => {
  if (uses.type === "local") {
    return false;
  }
  if (uses.type === "repository") {
    return !COMMIT.test(uses.gitRef);
  }
  return Option.isNone(uses.hash);
};
