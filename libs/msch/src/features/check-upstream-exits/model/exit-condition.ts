import { Array as Arr, Match, Option, String as Str, pipe } from "effect";
import semver from "semver";

import { groupOf } from "#/shared/lib/match-groups.ts";

export type Registry = "npm" | "crate";
export type Relation = "drops" | "allows" | "requires";

export interface Unused {
  readonly kind: "unused";
}

export interface Published {
  readonly kind: "published";
  readonly registry: Registry;
  readonly name: string;
  readonly range: string;
}

export interface Declares {
  readonly kind: "declares";
  readonly registry: Registry;
  readonly name: string;
  readonly relation: Relation;
  readonly dependency: string;
  readonly range: string;
}

export interface Closed {
  readonly kind: "closed";
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
}

export type ExitCondition = Unused | Published | Declares | Closed;

const ALTERNATIVE = " || ";
const UNUSED = "unused";
const ANY_RANGE = "*";
const EXIT_COMMENT = /^#?\s*exit:\s*(?<condition>.*?)\s*$/u;
const PACKAGE = String.raw`(?:@[^\s/@]+\/)?[^\s@]+`;
const REGISTRY_CONDITION = new RegExp(
  String.raw`^(?<registry>npm|crate):(?<name>${PACKAGE})(?:@(?<range>.+)| (?<relation>drops|allows|requires) (?<dependency>${PACKAGE})(?:@(?<dependencyRange>.+))?)$`,
  "u",
);
const GITHUB_CONDITION = /^github:(?<owner>[\w.-]+)\/(?<repo>[\w.-]+)#(?<number>[1-9]\d*)$/u;

export const GRAMMAR =
  "`unused`, `npm:<package>@<range>`, `npm:<package> drops <dependency>`, `npm:<package> allows <dependency>@<range>`, `npm:<package> requires <dependency>@<range>` (the same forms with `crate:`), or `github:<owner>/<repo>#<number>`, joined with ` || `";

const isRegistry = (value: string): value is Registry => value === "npm" || value === "crate";

const isRelation = (value: string): value is Relation =>
  value === "drops" || value === "allows" || value === "requires";

const validRange = (range: string): Option.Option<string> =>
  Option.liftPredicate(range, (candidate) => semver.validRange(candidate) !== null);

interface Subject {
  readonly registry: Registry;
  readonly name: string;
}

const declared = (subject: Subject, found: RegExpExecArray): Option.Option<ExitCondition> => {
  const relation = Option.filter(groupOf("relation")(found), isRelation);
  const dependency = groupOf("dependency")(found);
  const range = groupOf("dependencyRange")(found);
  if (Option.isNone(relation) || Option.isNone(dependency)) {
    return Option.none();
  }
  const base = {
    kind: "declares",
    ...subject,
    relation: relation.value,
    dependency: dependency.value,
  } as const;
  if (relation.value === "drops") {
    return Option.match(range, {
      onNone: () => Option.some({ ...base, range: ANY_RANGE }),
      onSome: () => Option.none(),
    });
  }
  return pipe(
    range,
    Option.flatMap(validRange),
    Option.map((valid): ExitCondition => ({ ...base, range: valid })),
  );
};

const registryCondition = (text: string): Option.Option<ExitCondition> => {
  const found = REGISTRY_CONDITION.exec(text);
  if (found === null) {
    return Option.none();
  }
  const subject = Option.all({
    registry: Option.filter(groupOf("registry")(found), isRegistry),
    name: groupOf("name")(found),
  });
  const range = groupOf("range")(found);
  const conditionOf = (resolved: Subject): Option.Option<ExitCondition> =>
    Option.match(range, {
      onNone: () => declared(resolved, found),
      onSome: (published) =>
        Option.map(validRange(published), (valid): ExitCondition => ({
          kind: "published",
          ...resolved,
          range: valid,
        })),
    });
  return pipe(subject, Option.flatMap(conditionOf));
};

const githubCondition = (text: string): Option.Option<ExitCondition> => {
  const found = GITHUB_CONDITION.exec(text);
  const issueNumber = pipe(groupOf("number")(found), Option.map(Number));
  return pipe(
    Option.all({
      owner: groupOf("owner")(found),
      repo: groupOf("repo")(found),
      number: issueNumber,
    }),
    Option.map((issue): ExitCondition => ({ kind: "closed", ...issue })),
  );
};

const alternativeOf = (text: string): Option.Option<ExitCondition> => {
  if (text === UNUSED) {
    return Option.some({ kind: "unused" });
  }
  return Option.orElse(registryCondition(text), () => githubCondition(text));
};

export const parseCondition = (text: string): Option.Option<readonly ExitCondition[]> =>
  pipe(
    Str.split(text, ALTERNATIVE),
    Arr.map((alternative) => alternativeOf(Str.trim(alternative))),
    Option.all,
  );

export const exitTextOf = (comment: string): Option.Option<string> =>
  groupOf("condition")(EXIT_COMMENT.exec(Str.trim(comment)));

const describeDeclares = (condition: Declares): string => {
  const subject = `${condition.registry}:${condition.name} ${condition.relation} ${condition.dependency}`;
  if (condition.relation === "drops") {
    return subject;
  }
  return `${subject}@${condition.range}`;
};

export const describeCondition = (condition: ExitCondition): string =>
  Match.value(condition).pipe(
    Match.discriminatorsExhaustive("kind")({
      unused: () => UNUSED,
      published: ({ registry, name, range }) => `${registry}:${name}@${range}`,
      declares: describeDeclares,
      closed: ({ owner, repo, number }) => `github:${owner}/${repo}#${String(number)}`,
    }),
  );

export const isUnused = (condition: ExitCondition): boolean => condition.kind === "unused";
