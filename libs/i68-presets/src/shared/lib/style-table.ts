import { Array as Arr, Number as Num, Option, Record as Rec, pipe } from "effect";

import type { Step } from "./degrees.ts";

export type Transitions = Readonly<Record<string, Readonly<Record<string, number>>>>;

export interface StyleTable {
  readonly name: string;
  readonly source: string;
  readonly order: number;
  readonly transitions: Transitions;
}

export interface Context {
  readonly words: string;
  readonly next: Readonly<Record<string, number>>;
  readonly total: number;
}

const FIRST = 1;

const contextOf =
  (table: StyleTable, seen: number, before: readonly Step[]) =>
  (length: number): Option.Option<Context> => {
    const words = pipe(
      Arr.takeRight(before, length),
      Arr.map((step) => step.token),
      Arr.join(" "),
    );
    return pipe(
      Rec.get(table.transitions, words),
      Option.map((next) => ({ words, next, total: Num.sumAll(Rec.values(next)) })),
      Option.filter((context) => context.total >= seen),
    );
  };

export const longestContext = (
  table: StyleTable,
  seen: number,
  before: readonly Step[],
): Option.Option<Context> =>
  pipe(
    Arr.range(FIRST, Math.min(table.order, before.length)),
    Arr.reverse,
    Arr.findFirst(contextOf(table, seen, before)),
  );
