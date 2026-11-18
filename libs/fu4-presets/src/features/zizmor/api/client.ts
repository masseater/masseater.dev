import { Array as Arr, Cache, Effect, Option, Schema } from "effect";

import { GitHubError } from "#/features/zizmor/model/github.ts";
import type {
  Advisory,
  FastPath,
  GitHubClient,
  GitHubEffect,
  Reachability,
  RepoRefs,
} from "#/features/zizmor/model/github.ts";

import { listRefs } from "./refs.ts";
import { apiGet, decoded, isOk, unlessMissing } from "./rest.ts";
import type { Session } from "./rest.ts";
import type { Reply } from "./transport.ts";

type Pair = readonly [string, string];

type Lookup<Key, Value, Failure> = (key: Key) => Effect.Effect<Value, Failure>;

const CAPACITY = Number.MAX_SAFE_INTEGER;
const NO_QUERY = {};

const Repo = Schema.Struct({ default_branch: Schema.String });
const TagLookup = Schema.Struct({
  object: Schema.Struct({ sha: Schema.String, type: Schema.Literals(["commit", "tag"]) }),
});
const Comparison = Schema.Struct({
  status: Schema.Literals(["ahead", "behind", "diverged", "identical"]),
});
const Advisories = Schema.Array(Schema.Struct({ ghsa_id: Schema.String, severity: Schema.String }));
const BranchCommits = Schema.Struct({
  branches: Schema.Array(Schema.Struct({ branch: Schema.String })),
  tags: Schema.Array(Schema.String),
});

const decodeTag = Schema.decodeEffect(Schema.fromJsonString(TagLookup));
const decodeComparison = Schema.decodeEffect(Schema.fromJsonString(Comparison));

const readRepo = decoded(Schema.decodeEffect(Schema.fromJsonString(Repo)));
const readTag = unlessMissing(decoded(decodeTag));
const readComparison = unlessMissing(decoded(decodeComparison));
const readAdvisories = decoded(Schema.decodeEffect(Schema.fromJsonString(Advisories)));
const readBranchCommits = decoded(Schema.decodeEffect(Schema.fromJsonString(BranchCommits)));

const cached = <Key, Value, Failure>(
  lookup: Lookup<Key, Value, Failure>,
): Effect.Effect<Lookup<Key, Value, Failure>> =>
  Effect.map(
    Cache.make({ lookup, capacity: CAPACITY }),
    (cache) =>
      (key: Key): Effect.Effect<Value, Failure> =>
        Cache.get(cache, key),
  );

const peelWith =
  (session: Session) =>
  ([slug, sha]: Pair): GitHubEffect<string> => {
    const step = (current: string): GitHubEffect<string> =>
      apiGet(session)(`/repos/${slug}/git/tags/${current}`, NO_QUERY).pipe(
        Effect.flatMap(readTag),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(current),
            onSome: ({ object }) => {
              if (object.type === "commit") {
                return Effect.succeed(object.sha);
              }
              return step(object.sha);
            },
          }),
        ),
      );
    return step(sha);
  };

const fastPathOf = (reply: Reply): Effect.Effect<FastPath> => {
  if (!isOk(reply)) {
    return Effect.succeed("unknown");
  }
  return readBranchCommits(reply).pipe(
    Effect.map((found): FastPath => {
      if (Arr.isReadonlyArrayEmpty(found.branches) && Arr.isReadonlyArrayEmpty(found.tags)) {
        return "absent";
      }
      return "contained";
    }),
    Effect.orElseSucceed((): FastPath => "unknown"),
  );
};

const branchCommitsWith = (session: Session): Lookup<Pair, FastPath, never> => {
  const blocked = new Set<string>();
  const { web } = session.endpoints;
  return ([slug, sha]) => {
    if (blocked.has(web)) {
      return Effect.succeed("unknown");
    }
    return session
      .transport({
        method: "GET",
        url: `${web}/${slug}/branch_commits/${sha}`,
        headers: { Accept: "application/json" },
        body: Option.none(),
      })
      .pipe(
        Effect.flatMap(fastPathOf),
        Effect.orElseSucceed((): FastPath => "unknown"),
        Effect.tap((found) =>
          Effect.sync(() => {
            if (found === "unknown") {
              blocked.add(web);
            }
          }),
        ),
      );
  };
};

const isContained = (comparison: Option.Option<typeof Comparison.Type>): boolean =>
  Option.exists(comparison, ({ status }) => status === "behind" || status === "identical");

const containsWith =
  (session: Session) =>
  ([slug, range]: Pair): GitHubEffect<boolean> =>
    apiGet(session)(`/repos/${slug}/compare/${range}`, NO_QUERY).pipe(
      Effect.flatMap(readComparison),
      Effect.map(isContained),
    );

const advisoryOf = (advisory: (typeof Advisories.Type)[number]): Advisory => ({
  id: advisory.ghsa_id,
  severity: advisory.severity,
});

const advisoriesWith =
  (session: Session) =>
  ([slug, version]: Pair): GitHubEffect<readonly Advisory[]> =>
    apiGet(session)("/advisories", { ecosystem: "actions", affects: `${slug}@${version}` }).pipe(
      Effect.flatMap(readAdvisories),
      Effect.map(Arr.map(advisoryOf)),
    );

const missing = (slug: string): GitHubError =>
  GitHubError.make({ message: `can't access ${slug}: missing or you have no access` });

const repoWith =
  (session: Session) =>
  (slug: string): GitHubEffect<typeof Repo.Type> =>
    apiGet(session)(`/repos/${slug}`, NO_QUERY).pipe(Effect.flatMap(readRepo));

const present =
  (slug: string) =>
  (found: Option.Option<RepoRefs>): GitHubEffect<RepoRefs> =>
    Effect.fromOption(found).pipe(Effect.mapError(() => missing(slug)));

export const makeClient = Effect.fn("fu4.github.client")(function* makeClient(
  session: Session,
  reachability: Reachability,
) {
  const refs = yield* cached(listRefs(session));
  const repo = yield* cached(repoWith(session));
  const peeled = yield* cached(peelWith(session));
  const branchCommits = yield* cached(branchCommitsWith(session));
  const contains = yield* cached(containsWith(session));
  const advisories = yield* cached(advisoriesWith(session));
  const client: GitHubClient = {
    refs: (slug) => Effect.flatMap(refs(slug), present(slug)),
    exists: (slug) => Effect.map(refs(slug), Option.isSome),
    defaultBranch: (slug) => Effect.map(repo(slug), (found) => found.default_branch),
    peeled: (slug) => (sha) => peeled([slug, sha]),
    branchCommits: (slug) => (sha) => branchCommits([slug, sha]),
    contains: (slug) => (base, head) => contains([slug, `${base}...${head}`]),
    advisories: (slug) => (version) => advisories([slug, version]),
    reachability,
  };
  return client;
});
