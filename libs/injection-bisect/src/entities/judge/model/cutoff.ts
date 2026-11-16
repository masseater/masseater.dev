import { Array as Arr, Option, String as Str } from "effect";

export const DEFAULT_CUTOFF = 0.8;

const INCEPTION_CUTOFF = 0.9;

const CUTOFFS: readonly (readonly [string, number])[] = [["inception/", INCEPTION_CUTOFF]];

export const cutoffFor = (model: string): number =>
  Option.match(
    Arr.findFirst(CUTOFFS, ([provider]) => Str.startsWith(provider)(model)),
    { onNone: () => DEFAULT_CUTOFF, onSome: ([, cutoff]) => cutoff },
  );
