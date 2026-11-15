import { Array, Match, Option, Predicate, String, pipe } from "effect";

import { screamingSnakeCase } from "./names.ts";
import { itemLines } from "./render-items.ts";
import { someTy } from "./rust-type.ts";
import { escape, when } from "./text.ts";
import type { Constant, Item, Ty } from "./types.ts";

export interface Rendering {
  readonly header: string;
  readonly derive: readonly string[];
  readonly items: readonly Item[];
  readonly constants: readonly Constant[];
}

const SPECTA_TYPE = "specta::Type";
const PATH_SEPARATOR = "::";

const tysOf = (item: Item): readonly Ty[] =>
  Match.value(item).pipe(
    Match.tagsExhaustive({
      Struct: ({ fields }) =>
        pipe(
          fields,
          Array.map(({ ty }) => ty),
        ),
      Tagged: ({ variants }) =>
        pipe(
          variants,
          Array.flatMap(({ fields }) => fields),
          Array.map(({ ty }) => ty),
        ),
      Enumeration: () => [],
      Alias: ({ ty }) => [ty],
    }),
  );

const directFloat =
  (isFloat: (name: string) => boolean) =>
  (ty: Ty): boolean =>
    Match.value(ty).pipe(
      Match.tag("Prim", ({ name }) => name === "f64"),
      Match.tag("Named", ({ name }) => isFloat(name)),
      Match.orElse(() => false),
    );

const itemHasFloat = (isFloat: (name: string) => boolean): ((item: Item) => boolean) => {
  const floatTy = someTy(directFloat(isFloat));
  return (item) => pipe(tysOf(item), Array.some(floatTy));
};

const floatsIn = (items: readonly Item[]): ((name: string) => boolean) => {
  const byName = new Map(
    pipe(
      items,
      Array.map((item) => [item.name, item] as const),
    ),
  );
  const memo = new Map<string, boolean>();
  const isFloat = (name: string): boolean =>
    pipe(
      Option.fromNullishOr(memo.get(name)),
      Option.getOrElse(() => {
        memo.set(name, false);
        const result = pipe(
          Option.fromNullishOr(byName.get(name)),
          Option.exists(itemHasFloat(isFloat)),
        );
        memo.set(name, result);
        return result;
      }),
    );
  return isFloat;
};

const constantLine = ({ name, value }: Constant): string => {
  const rustName = screamingSnakeCase(name);
  return Match.value(value).pipe(
    Match.when(Predicate.isString, (text) => `pub const ${rustName}: &str = "${escape(text)}";`),
    Match.when(
      Predicate.isBoolean,
      (flag) => `pub const ${rustName}: bool = ${globalThis.String(flag)};`,
    ),
    Match.when(
      Number.isInteger,
      (count) => `pub const ${rustName}: i64 = ${globalThis.String(count)};`,
    ),
    Match.orElse((amount) => `pub const ${rustName}: f64 = ${globalThis.String(amount)};`),
  );
};

const isMap = (ty: Ty): boolean => Predicate.isTagged(ty, "Dictionary");

const usesMap = (items: readonly Item[]): boolean =>
  pipe(items, Array.flatMap(tysOf), Array.some(someTy(isMap)));

const derivePaths = (derive: readonly string[]): readonly string[] =>
  pipe(derive, Array.filter(String.includes(PATH_SEPARATOR)));

const importLines = ({ items, derive }: Rendering): readonly string[] =>
  pipe(
    when(Array.isReadonlyArrayNonEmpty(items))(() => [
      "serde::{Deserialize, Serialize}",
      ...derivePaths(derive),
      ...when(usesMap(items))(() => ["std::collections::BTreeMap"]),
    ]),
    Array.sortBy(String.Order),
    Array.map((path) => `use ${path};`),
  );

const shortName = (path: string): string =>
  pipe(path, String.split(PATH_SEPARATOR), Array.lastNonEmpty);

const deriveLine =
  (extra: readonly string[]) =>
  (base: readonly string[]): string =>
    `#[derive(${pipe([...base, "Serialize", "Deserialize", ...extra], Array.join(", "))})]`;

export const render = (rendering: Rendering): string => {
  const extra = pipe(rendering.derive, Array.map(shortName));
  const lines = itemLines({
    derive: deriveLine(extra),
    specta: pipe(rendering.derive, Array.contains(SPECTA_TYPE)),
    hasFloat: floatsIn(rendering.items),
  });
  const sections = pipe(
    [
      [rendering.header],
      importLines(rendering),
      pipe(rendering.constants, Array.map(constantLine)),
      ...pipe(rendering.items, Array.map(lines)),
    ],
    Array.filter(Array.isReadonlyArrayNonEmpty),
    Array.map(Array.join("\n")),
  );
  return `${pipe(sections, Array.join("\n\n"))}\n`;
};
