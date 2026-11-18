import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";

import { merge } from "./merge.ts";
import { ANY, BOOL, NULL, NUMBER, STRING, arrayOf, strict } from "./types.ts";
import type { ExprType } from "./types.ts";

const NEXT = 1;

const SCALARS: Readonly<Record<string, ExprType>> = {
  boolean: BOOL,
  number: NUMBER,
  string: STRING,
};

const merged = (types: readonly ExprType[]): ExprType =>
  Option.match(Arr.head(types), {
    onNone: () => ANY,
    onSome: (first) => {
      let acc = first;
      for (const type of Arr.drop(types, NEXT)) {
        acc = merge(acc)(type);
      }
      return acc;
    },
  });

export const ofJson = (value: unknown): ExprType => {
  if (value === null) {
    return NULL;
  }
  if (Arr.isArray(value)) {
    const items: readonly unknown[] = value;
    const types = pipe(
      items,
      Arr.map((item) => ofJson(item)),
    );
    return arrayOf(merged(types));
  }
  if (Predicate.isObject(value)) {
    return strict(
      pipe(
        value,
        Rec.map((prop) => ofJson(prop)),
      ),
    );
  }
  return Option.getOrElse(Rec.get(SCALARS, typeof value), () => ANY);
};
