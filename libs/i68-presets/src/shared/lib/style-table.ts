import { Array as Arr, Number as Num, Option, Record as Rec, Schema, pipe } from "effect";

import type { Step } from "./degrees.ts";

export const StyleTableSchema = Schema.Struct({
  name: Schema.String,
  source: Schema.String,
  order: Schema.Int,
  transitions: Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Int)),
});

export type StyleTable = typeof StyleTableSchema.Type;

export type Transitions = StyleTable["transitions"];

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
