import type { Predicate } from "effect";
import { Array, Match, Option, pipe } from "effect";

import { prim } from "./types.ts";
import type { Ty } from "./types.ts";

const WIDE_INTEGERS = new Set(["i64", "u64"]);
const SPECTA_NUMBER = "specta_typescript::Number";
const SPECTA_UNKNOWN = "specta_typescript::Unknown";
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

export const spectaType =
  (aliasOf: (name: string) => Option.Option<Ty>) =>
  (ty: Ty): Ty =>
    Match.value(ty).pipe(
      Match.tagsExhaustive({
        Prim: ({ name }) =>
          Match.value(WIDE_INTEGERS.has(name)).pipe(
            Match.when(true, () => prim(SPECTA_NUMBER)),
            Match.orElse(() => ty),
          ),
        Json: () => prim(SPECTA_UNKNOWN),
        Named: ({ name }) =>
          pipe(
            aliasOf(name),
            Option.flatMap((target) =>
              Option.liftPredicate(
                spectaType(aliasOf)(target),
                (override) => rustType(override) !== rustType(target),
              ),
            ),
            Option.getOrElse(() => ty),
          ),
        Optional: (inner) => ({ ...inner, of: spectaType(aliasOf)(inner.of) }),
        List: (inner) => ({ ...inner, of: spectaType(aliasOf)(inner.of) }),
        Boxed: (inner) => ({ ...inner, of: spectaType(aliasOf)(inner.of) }),
        Dictionary: (inner) => ({
          ...inner,
          key: spectaType(aliasOf)(inner.key),
          value: spectaType(aliasOf)(inner.value),
        }),
        Tuple: (inner) => ({ ...inner, items: pipe(inner.items, Array.map(spectaType(aliasOf))) }),
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
