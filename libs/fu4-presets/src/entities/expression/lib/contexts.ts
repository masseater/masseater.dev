import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { BOOL, NUMBER, STRING, loose, mapOf, strict } from "#/entities/expression/model/types.ts";
import type { ExprType } from "#/entities/expression/model/types.ts";
import contexts from "#/shared/data/contexts.json" with { type: "json" };

type Doc = string | { readonly [key: string]: Doc };

const DOCUMENTED: Readonly<Record<string, Doc>> = contexts;
const PLACEHOLDER = "<";

const SCALARS: Readonly<Record<string, ExprType>> = {
  string: STRING,
  number: NUMBER,
  boolean: BOOL,
};

const typeOf = (doc: Doc): ExprType => {
  if (typeof doc === "string") {
    return Option.getOrElse(Rec.get(SCALARS, doc), () => loose());
  }
  return pipe(
    Rec.toEntries(doc),
    Arr.findFirst(([key]) => Str.startsWith(PLACEHOLDER)(key)),
    Option.match({
      onNone: () =>
        strict(
          pipe(
            Rec.toEntries(doc),
            Arr.map(([key, prop]): [string, ExprType] => [Str.toLowerCase(key), typeOf(prop)]),
            Rec.fromEntries,
          ),
        ),
      onSome: ([, elem]) => mapOf(typeOf(elem)),
    }),
  );
};

export const documented = (name: string): ExprType =>
  pipe(Rec.get(DOCUMENTED, name), Option.match({ onNone: () => strict(), onSome: typeOf }));
