import type { Predicate } from "effect";
import { Array, Match, pipe } from "effect";

import { prim } from "./types.ts";
import type { Ty } from "./types.ts";

const WIDE_INTEGERS = new Set(["i64", "u64"]);
const SPECTA_NUMBER = "specta_typescript::Number";
const SINGLE = 1;

const tupleType = (items: readonly string[]): string =>
  Match.value(items.length).pipe(
    Match.when(SINGLE, () => `(${pipe(items, Array.join(""))},)`),
    Match.orElse(() => `(${pipe(items, Array.join(", "))})`),
  );

export const rustType = (ty: Ty): string =>
  Match.value(ty).pipe(
    Match.tagsExhaustive({
      Prim: ({ name }) => name,
      Json: () => "serde_json::Value",
      Named: ({ name }) => name,
      Optional: ({ of }) => `Option<${rustType(of)}>`,
      List: ({ of }) => `Vec<${rustType(of)}>`,
      Dictionary: ({ key, value }) => `BTreeMap<${rustType(key)}, ${rustType(value)}>`,
      Tuple: ({ items }) => tupleType(pipe(items, Array.map(rustType))),
      Boxed: ({ of }) => `Box<${rustType(of)}>`,
    }),
  );

export const spectaNumber = (ty: Ty): Ty =>
  Match.value(ty).pipe(
    Match.tagsExhaustive({
      Prim: ({ name }) =>
        Match.value(WIDE_INTEGERS.has(name)).pipe(
          Match.when(true, () => prim(SPECTA_NUMBER)),
          Match.orElse(() => ty),
        ),
      Json: () => ty,
      Named: () => ty,
      Optional: (inner) => ({ ...inner, of: spectaNumber(inner.of) }),
      List: (inner) => ({ ...inner, of: spectaNumber(inner.of) }),
      Boxed: (inner) => ({ ...inner, of: spectaNumber(inner.of) }),
      Dictionary: (inner) => ({
        ...inner,
        key: spectaNumber(inner.key),
        value: spectaNumber(inner.value),
      }),
      Tuple: (inner) => ({ ...inner, items: pipe(inner.items, Array.map(spectaNumber)) }),
    }),
  );

export const someTy =
  (predicate: Predicate.Predicate<Ty>) =>
  (ty: Ty): boolean =>
    predicate(ty) ||
    Match.value(ty).pipe(
      Match.tagsExhaustive({
        Prim: () => false,
        Json: () => false,
        Named: () => false,
        Optional: ({ of }) => someTy(predicate)(of),
        List: ({ of }) => someTy(predicate)(of),
        Boxed: ({ of }) => someTy(predicate)(of),
        Dictionary: ({ key, value }) => someTy(predicate)(key) || someTy(predicate)(value),
        Tuple: ({ items }) => pipe(items, Array.some(someTy(predicate))),
      }),
    );
