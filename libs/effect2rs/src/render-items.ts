import { Array, Match, pipe } from "effect";

import { pascalCase } from "./names.ts";
import { enumLines, variantNaming } from "./render-enum.ts";
import { camelCased, fieldLines, renameAllCamel } from "./render-fields.ts";
import { rustType } from "./rust-type.ts";
import { attribute, docLines, escape } from "./text.ts";
import type { Item, Struct, Tagged, Variant } from "./types.ts";

export interface Style {
  readonly derive: (base: readonly string[]) => string;
  readonly specta: boolean;
  readonly hasFloat: (name: string) => boolean;
}

const COMPARABLE = ["Debug", "Clone", "PartialEq"];
const EQ = [...COMPARABLE, "Eq"];
const COPY = ["Debug", "Clone", "Copy", "PartialEq", "Eq", "Hash"];
const FIELD = "    ";
const VARIANT_FIELD = "        ";

const dataDerive =
  (style: Style) =>
  (name: string): string =>
    style.derive(
      Match.value(style.hasFloat(name)).pipe(
        Match.when(true, () => COMPARABLE),
        Match.orElse(() => EQ),
      ),
    );

const struct =
  (style: Style) =>
  (item: Struct): readonly string[] => {
    const camel = camelCased(item.fields);
    const lines = fieldLines({ specta: style.specta, visibility: "pub ", indent: FIELD, camel });
    return [
      ...docLines("")(item.doc),
      dataDerive(style)(item.name),
      ...attribute({ name: "serde", parts: renameAllCamel(camel), indent: "" }),
      `pub struct ${item.name} {`,
      ...pipe(item.fields, Array.flatMap(lines)),
      "}",
    ];
  };

const variantBody =
  (style: Style) =>
  ({ value, fields }: Variant): readonly string[] => {
    const lines = fieldLines({
      specta: style.specta,
      visibility: "",
      indent: VARIANT_FIELD,
      camel: camelCased(fields),
    });
    return Match.value(Array.isReadonlyArrayEmpty(fields)).pipe(
      Match.when(true, () => [`${FIELD}${pascalCase(value)},`]),
      Match.orElse(() => [
        `${FIELD}${pascalCase(value)} {`,
        ...pipe(fields, Array.flatMap(lines)),
        `${FIELD}},`,
      ]),
    );
  };

const variant =
  (style: Style, perVariant: (value: string) => readonly string[]) =>
  (entry: Variant): readonly string[] => [
    ...docLines(FIELD)(entry.doc),
    ...attribute({
      name: "serde",
      parts: [...perVariant(entry.value), ...renameAllCamel(camelCased(entry.fields))],
      indent: FIELD,
    }),
    ...variantBody(style)(entry),
  ];

const tagged =
  (style: Style) =>
  (item: Tagged): readonly string[] => {
    const naming = variantNaming(
      pipe(
        item.variants,
        Array.map(({ value }) => value),
      ),
    );
    return [
      ...docLines("")(item.doc),
      dataDerive(style)(item.name),
      ...attribute({
        name: "serde",
        parts: [`tag = "${escape(item.tag)}"`, ...naming.renameAll],
        indent: "",
      }),
      `pub enum ${item.name} {`,
      ...pipe(item.variants, Array.flatMap(variant(style, naming.perVariant))),
      "}",
    ];
  };

export const itemLines = (style: Style): ((item: Item) => readonly string[]) => {
  const enumeration = enumLines(style.derive(COPY));
  const structure = struct(style);
  const union = tagged(style);
  return (item) =>
    Match.value(item).pipe(
      Match.tagsExhaustive({
        Struct: structure,
        Tagged: union,
        Enumeration: enumeration,
        Alias: ({ name, doc, ty }) => [...docLines("")(doc), `pub type ${name} = ${rustType(ty)};`],
      }),
    );
};
