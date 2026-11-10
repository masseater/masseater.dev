import { Array as Arr, Option, String as Str, Function as Fn } from "effect";

import type { ResolutionState } from "./resolution-types.ts";
import type { TargetRequest } from "./resolver-target.ts";

const DATA_FIRST_ARITY = 2;
const DATA_FIRST_ARITY_3 = 3;

const NOT_FOUND = -1;
const STAR_LENGTH = 1;
const START = 0;
const BEFORE = -1;
const AFTER = 1;
const EQUAL = 0;

const baseLength = (key: string): number =>
  Option.match(Str.indexOf("*")(key), {
    onNone: () => key.length,
    onSome: (star) => star + STAR_LENGTH,
  });

interface KeyPair {
  readonly left: string;
  readonly right: string;
}

const KEY_ORDER_RULES: readonly ((pair: KeyPair) => Option.Option<number>)[] = [
  ({ left, right }) =>
    Option.liftPredicate(Math.sign(baseLength(right) - baseLength(left)), (sign) => sign !== EQUAL),
  ({ left }) => Option.liftPredicate(AFTER, () => !Str.includes("*")(left)),
  ({ right }) => Option.liftPredicate(BEFORE, () => !Str.includes("*")(right)),
];

const comparePatternKeys: {
  (right: string): (left: string) => number;
  (left: string, right: string): number;
} = Fn.dual(DATA_FIRST_ARITY, (left: string, right: string): number =>
  Arr.findFirst(KEY_ORDER_RULES, (rule) => rule({ left, right })).pipe(
    Option.getOrElse(() => Math.sign(right.length - left.length)),
  ),
);

const hasOneAsterisk = (key: string): boolean =>
  Option.exists(Str.indexOf("*")(key), (first) =>
    Option.contains(Str.lastIndexOf("*")(key), first),
  );

const surroundsName = (target: string, star: number, name: string): boolean =>
  Str.startsWith(Str.slice(START, star)(target))(name) &&
  Str.endsWith(Str.slice(star + STAR_LENGTH)(target))(name);

const matchesPatternWithTrailer = (target: string, name: string): boolean =>
  !Str.endsWith("*")(target) &&
  Option.exists(Str.indexOf("*")(target), (star) => surroundsName(target, star, name));

type Expansion = Option.Option<Omit<TargetRequest, "key">>;

const trailerExpansion = (key: string, name: string, state: ResolutionState): Expansion =>
  Option.liftPredicate(
    key,
    (candidate) => state.features.patternTrailers && matchesPatternWithTrailer(candidate, name),
  ).pipe(
    Option.flatMap((candidate) =>
      Option.map(Str.indexOf("*")(candidate), (star) => {
        const end = name.length - (candidate.length - STAR_LENGTH - star);
        return { subpath: Str.slice(star, end)(name), pattern: true };
      }),
    ),
  );

const starSuffixExpansion = (key: string, name: string): Expansion =>
  Option.liftPredicate(
    { subpath: Str.slice(key.length - STAR_LENGTH)(name), pattern: true },
    () => Str.endsWith("*")(key) && Str.startsWith(Str.slice(START, NOT_FOUND)(key))(name),
  );

const prefixExpansion = (key: string, name: string): Expansion =>
  Option.liftPredicate({ subpath: Str.slice(key.length)(name), pattern: false }, () =>
    Str.startsWith(key)(name),
  );

const expandedSubpath: {
  (name: string, state: ResolutionState): (key: string) => Expansion;
  (key: string, name: string, state: ResolutionState): Expansion;
} = Fn.dual(DATA_FIRST_ARITY_3, (key: string, name: string, state: ResolutionState): Expansion =>
  trailerExpansion(key, name, state).pipe(
    Option.orElse(() => starSuffixExpansion(key, name)),
    Option.orElse(() => prefixExpansion(key, name)),
  ),
);

export { comparePatternKeys, expandedSubpath, hasOneAsterisk };
export type { Expansion };
