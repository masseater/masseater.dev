import { Array, Match, String, pipe } from "effect";

import type { Item, Struct, Tagged, Ty, Variant } from "#/entities/rust-item/index.ts";
import { attribute, docLines, escape } from "#/shared/lib/text.ts";

import { enumLines, variantNaming, variantsOf } from "./render-enum.ts";
import { camelCased, fieldLines, renameAllCamel } from "./render-fields.ts";
import { rustType } from "./rust-type.ts";

export interface Style {
  readonly derive: (base: readonly string[]) => string;
  readonly specta: (ty: Ty) => Ty;
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

interface Laid {
  readonly head: readonly string[];
  readonly name: string;
  readonly fields: readonly (readonly string[])[];
}

const STRUCT_VARIANT_WIDTH = 35;
const MAX_WIDTH = 100;
const ONE_LINE_PUNCTUATION = " {  },".length;
const SINGLE_LINE = 1;
const TRAILING_COMMA = /,$/u;

const laidOut =
  (style: Style, perVariant: (value: string) => readonly string[]) =>
  ([entry, name]: readonly [Variant, string]): Laid => {
    const lines = fieldLines({
      specta: style.specta,
      visibility: "",
      indent: VARIANT_FIELD,
      camel: camelCased(entry.fields),
    });
    return {
      head: [
        ...docLines(FIELD)(entry.doc),
        ...attribute({
          name: "serde",
          parts: [...perVariant(entry.value), ...renameAllCamel(camelCased(entry.fields))],
          indent: FIELD,
        }),
      ],
      name,
      fields: pipe(entry.fields, Array.map(lines)),
    };
  };

const oneLineText = ({ fields }: Laid): string =>
  pipe(
    fields,
    Array.flatMap((lines) => lines),
    Array.map((line) => pipe(line, String.trim, String.replace(TRAILING_COMMA, ""))),
    Array.join(", "),
  );

const isUnit = ({ fields }: Laid): boolean => Array.isReadonlyArrayEmpty(fields);

const fitsOneLine = (laid: Laid): boolean => {
  const text = oneLineText(laid);
  const plain = pipe(
    laid.fields,
    Array.every((lines) => lines.length === SINGLE_LINE),
  );
  const width = FIELD.length + laid.name.length + text.length + ONE_LINE_PUNCTUATION;
  return plain && text.length <= STRUCT_VARIANT_WIDTH && width <= MAX_WIDTH;
};

const isMultiLine = (laid: Laid): boolean =>
  Array.isReadonlyArrayNonEmpty(laid.head) || (!isUnit(laid) && !fitsOneLine(laid));

const bodyOf =
  (vertical: boolean) =>
  (laid: Laid): readonly string[] =>
    Match.value({ unit: isUnit(laid), oneLine: !vertical && fitsOneLine(laid) }).pipe(
      Match.when({ unit: true }, () => [`${FIELD}${laid.name},`]),
      Match.when({ oneLine: true }, () => [`${FIELD}${laid.name} { ${oneLineText(laid)} },`]),
      Match.orElse(() => [
        `${FIELD}${laid.name} {`,
        ...pipe(
          laid.fields,
          Array.flatMap((lines) => lines),
        ),
        `${FIELD}},`,
      ]),
    );

const tagged =
  (style: Style) =>
  (item: Tagged): readonly string[] => {
    const variants = variantsOf(
      pipe(
        item.variants,
        Array.map(({ value }) => value),
      ),
    );
    const naming = variantNaming(variants);
    const laid = pipe(
      item.variants,
      Array.zipWith(variants, (entry, { variant: name }) => [entry, name] as const),
      Array.map(laidOut(style, naming.perVariant)),
    );
    const vertical = pipe(laid, Array.some(isMultiLine)) && !pipe(laid, Array.every(isMultiLine));
    return [
      ...docLines("")(item.doc),
      dataDerive(style)(item.name),
      ...attribute({
        name: "serde",
        parts: [`tag = "${escape(item.tag)}"`, ...naming.renameAll],
        indent: "",
      }),
      `pub enum ${item.name} {`,
      ...pipe(
        laid,
        Array.flatMap((entry) => pipe(entry.head, Array.appendAll(bodyOf(vertical)(entry)))),
      ),
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
