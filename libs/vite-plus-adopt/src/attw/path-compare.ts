import { Array as Arr, Option, String as Str, pipe, Function as Fn } from "effect";

import { getRootLength } from "./path-roots.ts";
import { RELATIVE_SEGMENT, getPathComponents, reducePathComponents } from "./paths.ts";

const DATA_FIRST_ARITY = 2;
const FIRST = 0;
const SECOND = 1;

const compareStrings = (left: string, right: string): number =>
  Math.sign(Number(left > right) - Number(left < right));

const compareCaseInsensitive = (left: string, right: string): number =>
  compareStrings(Str.toUpperCase(left), Str.toUpperCase(right));

const compareComponents = (left: readonly string[], right: readonly string[]): number =>
  pipe(
    Arr.zip(left, right),
    Arr.drop(SECOND),
    Arr.map(([leftComponent, rightComponent]) =>
      compareCaseInsensitive(leftComponent, rightComponent),
    ),
    Arr.findFirst((result) => result !== FIRST),
    Option.getOrElse(() => Math.sign(left.length - right.length)),
  );

const compareRests = (left: string, right: string): number => {
  if (!RELATIVE_SEGMENT.test(left) && !RELATIVE_SEGMENT.test(right)) {
    return compareCaseInsensitive(left, right);
  }
  return compareComponents(
    reducePathComponents(getPathComponents(left)),
    reducePathComponents(getPathComponents(right)),
  );
};

const comparePathsCaseInsensitive: {
  (right: string): (left: string) => number;
  (left: string, right: string): number;
} = Fn.dual(DATA_FIRST_ARITY, (left: string, right: string): number => {
  const leftRoot = Str.slice(FIRST, getRootLength(left))(left);
  const rightRoot = Str.slice(FIRST, getRootLength(right))(right);
  return Option.liftPredicate(
    compareCaseInsensitive(leftRoot, rightRoot),
    (result) => result !== FIRST,
  ).pipe(
    Option.getOrElse(() =>
      compareRests(Str.slice(leftRoot.length)(left), Str.slice(rightRoot.length)(right)),
    ),
  );
});

export { comparePathsCaseInsensitive };
