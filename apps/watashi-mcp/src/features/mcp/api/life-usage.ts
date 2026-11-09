import { Array as Arr, Order, Record as Rec, pipe } from "effect";

import type { Entry } from "./life-filter";

type Usage = Readonly<{ count: number; first: string; last: string }>;

type KeysOf = (entry: Entry) => readonly string[];

const usageOfDays = (days: Arr.NonEmptyReadonlyArray<string>): Usage => ({
  count: Arr.length(days),
  first: Arr.min(days, Order.String),
  last: Arr.max(days, Order.String),
});

const usageOfPairs = (pairs: Arr.NonEmptyReadonlyArray<readonly [string, string]>): Usage =>
  usageOfDays(
    pipe(
      pairs,
      Arr.map(([, day]) => day),
    ),
  );

const pairsOf =
  (keysOf: KeysOf) =>
  (entry: Entry): readonly (readonly [string, string])[] =>
    pipe(
      keysOf(entry),
      Arr.map((key): readonly [string, string] => [key, entry.row.dayEnd]),
    );

const usageOf =
  (keysOf: KeysOf) =>
  (entries: readonly Entry[]): Readonly<Record<string, Usage>> =>
    pipe(
      entries,
      Arr.flatMap(pairsOf(keysOf)),
      Arr.groupBy(([key]) => key),
      Rec.map(usageOfPairs),
    );

const countOf =
  (keyOf: (entry: Entry) => string) =>
  (entries: readonly Entry[]): Readonly<Record<string, number>> =>
    pipe(entries, Arr.groupBy(keyOf), Rec.map(Arr.length));

export { countOf, usageOf };
export type { Usage };
