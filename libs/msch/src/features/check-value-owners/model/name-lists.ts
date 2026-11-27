import { Array as Arr, Option, Predicate, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { formatValues } from "#/shared/lib/values.ts";

import type { PackageScope, UnownedSite } from "./duplicates.ts";
import type { FileFacts } from "./free-literals.ts";

const RULE: RuleName = "hand-written-names";

export const MINIMUM_NAMES = 2;

export const MISSING_ALLOWANCE = 1;

export const TEST_FILE = /\.test(?:\.[\w-]+)?\.[cm]?tsx?$/u;

export interface FileLiterals extends FileFacts {
  readonly scope: PackageScope;
}

export interface NameList {
  readonly site: UnownedSite;
  readonly names: readonly string[];
}

export const nameListOf = (site: UnownedSite): Option.Option<NameList> => {
  if (TEST_FILE.test(site.file) || site.values.length < MINIMUM_NAMES) {
    return Option.none();
  }
  const names = pipe(site.values, Arr.filter(Predicate.isString));
  return Option.liftPredicate({ site, names }, (list) => list.names.length === site.values.length);
};

export const mostNamesOf = (list: NameList): number =>
  Math.max(MINIMUM_NAMES, list.names.length - MISSING_ALLOWANCE);

export interface Listed {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly names: readonly string[];
  readonly reason: string;
}

export const listedProblem = ({ file, line, column, names, reason }: Listed): Problem => ({
  file,
  line,
  column,
  rule: RULE,
  message: `The names ${formatValues(names)} are listed by hand, but ${reason}`,
});

export const problemOf = ({
  list,
  reason,
}: Readonly<{ list: NameList; reason: string }>): Problem =>
  listedProblem({
    file: list.site.file,
    line: list.site.line,
    column: list.site.column,
    names: list.names,
    reason,
  });
