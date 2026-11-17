import { Array as Arr, Function as Fn, Option, Record as Rec, String as Str, pipe } from "effect";
import { minimatch } from "minimatch";

import type { Override, RuleEntry, Y8Config } from "#/shared/config/index.ts";

const NEGATION = "!";
const KEY_SEPARATOR = ",";
const DATA_FIRST_ARITY = 2;

export interface FileGroup {
  readonly config: Y8Config;
  readonly files: readonly string[];
}

type Rules = Readonly<Record<string, RuleEntry>>;

interface Member {
  readonly path: string;
  readonly indexes: readonly number[];
}

const isNegated = Str.startsWith(NEGATION);

const isIncluded = (pattern: string): boolean => !isNegated(pattern);

const matchesAny =
  (path: string) =>
  (patterns: readonly string[]): boolean =>
    pipe(
      patterns,
      Arr.some((pattern) => minimatch(path, pattern, { dot: true })),
    );

const excludedOf = (override: Override): readonly string[] =>
  pipe(override.files, Arr.filter(isNegated), Arr.map(Str.slice(NEGATION.length)));

const applies =
  (path: string) =>
  (override: Override): boolean =>
    pipe(override.files, Arr.filter(isIncluded), matchesAny(path)) &&
    !matchesAny(path)(excludedOf(override));

const matchingIndexes = (config: Y8Config, path: string): readonly number[] =>
  pipe(
    config.overrides ?? [],
    Arr.flatMap((override, index) =>
      Option.toArray(Option.liftPredicate(index, () => applies(path)(override))),
    ),
  );

const entriesOf = (override: Override): readonly (readonly [string, RuleEntry])[] =>
  Rec.toEntries(override.rules);

const rulesWith = (base: Rules, overrides: readonly Override[]): Rules =>
  pipe(overrides, Arr.flatMap(entriesOf), Arr.prependAll(Rec.toEntries(base)), Rec.fromEntries);

const overridesAt =
  (overrides: readonly Override[]) =>
  (indexes: readonly number[]): readonly Override[] =>
    pipe(
      indexes,
      Arr.flatMap((index) => Option.toArray(Arr.get(overrides, index))),
    );

const configWith = (config: Y8Config, indexes: readonly number[]): Y8Config => {
  const { overrides = [], ...base } = config;
  return { ...base, rules: rulesWith(base.rules ?? {}, overridesAt(overrides)(indexes)) };
};

const keyOf = (member: Member): string =>
  pipe(member.indexes, Arr.map(String), Arr.join(KEY_SEPARATOR));

const groupOf =
  (config: Y8Config) =>
  (members: Arr.NonEmptyReadonlyArray<Member>): FileGroup => ({
    config: configWith(config, Arr.headNonEmpty(members).indexes),
    files: pipe(
      members,
      Arr.map((member) => member.path),
    ),
  });

export const groupByOverrides: {
  (files: readonly string[]): (config: Y8Config) => readonly FileGroup[];
  (config: Y8Config, files: readonly string[]): readonly FileGroup[];
} = Fn.dual(DATA_FIRST_ARITY, (config: Y8Config, files: readonly string[]): readonly FileGroup[] =>
  pipe(
    files,
    Arr.map((path): Member => ({ path, indexes: matchingIndexes(config, path) })),
    Arr.groupBy(keyOf),
    Rec.values,
    Arr.map(groupOf(config)),
  ),
);
