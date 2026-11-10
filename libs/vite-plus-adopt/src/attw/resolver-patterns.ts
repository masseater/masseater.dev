import { Array as Arr, Option } from "effect";

import type { ResolutionState } from "./resolution-types.ts";
import type { TargetRequest } from "./resolver-target.ts";

const NOT_FOUND = -1;
const STAR_LENGTH = 1;
const START = 0;
const BEFORE = -1;
const AFTER = 1;
const EQUAL = 0;

const baseLength = (key: string): number => {
  const star = key.indexOf("*");
  if (star === NOT_FOUND) {
    return key.length;
  }
  return star + STAR_LENGTH;
};

interface KeyPair {
  readonly left: string;
  readonly right: string;
}

const KEY_ORDER_RULES: readonly ((pair: KeyPair) => Option.Option<number>)[] = [
  ({ left, right }) =>
    Option.liftPredicate(Math.sign(baseLength(right) - baseLength(left)), (sign) => sign !== EQUAL),
  ({ left }) => Option.liftPredicate(AFTER, () => !left.includes("*")),
  ({ right }) => Option.liftPredicate(BEFORE, () => !right.includes("*")),
];

const comparePatternKeys = (left: string, right: string): number =>
  Arr.findFirst(KEY_ORDER_RULES, (rule) => rule({ left, right })).pipe(
    Option.getOrElse(() => Math.sign(right.length - left.length)),
  );

const hasOneAsterisk = (key: string): boolean => {
  const first = key.indexOf("*");
  return first !== NOT_FOUND && first === key.lastIndexOf("*");
};

const matchesPatternWithTrailer = (target: string, name: string): boolean => {
  const star = target.indexOf("*");
  return (
    !target.endsWith("*") &&
    star !== NOT_FOUND &&
    name.startsWith(target.slice(START, star)) &&
    name.endsWith(target.slice(star + STAR_LENGTH))
  );
};

type Expansion = Option.Option<Omit<TargetRequest, "key">>;

const trailerExpansion = (key: string, name: string, state: ResolutionState): Expansion =>
  Option.liftPredicate(
    key,
    (candidate) => state.features.patternTrailers && matchesPatternWithTrailer(candidate, name),
  ).pipe(
    Option.map((candidate) => {
      const star = candidate.indexOf("*");
      const end = name.length - (candidate.length - STAR_LENGTH - star);
      return { subpath: name.slice(star, end), pattern: true };
    }),
  );

const starSuffixExpansion = (key: string, name: string): Expansion =>
  Option.liftPredicate(
    { subpath: name.slice(key.length - STAR_LENGTH), pattern: true },
    () => key.endsWith("*") && name.startsWith(key.slice(START, NOT_FOUND)),
  );

const prefixExpansion = (key: string, name: string): Expansion =>
  Option.liftPredicate({ subpath: name.slice(key.length), pattern: false }, () =>
    name.startsWith(key),
  );

const expandedSubpath = (key: string, name: string, state: ResolutionState): Expansion =>
  trailerExpansion(key, name, state).pipe(
    Option.orElse(() => starSuffixExpansion(key, name)),
    Option.orElse(() => prefixExpansion(key, name)),
  );

export { comparePatternKeys, expandedSubpath, hasOneAsterisk };
export type { Expansion };
