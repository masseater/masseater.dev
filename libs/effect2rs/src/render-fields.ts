import { Array, Boolean, pipe } from "effect";

import { plainIdentifier, serdeCamelField } from "./names.ts";
import { rustType, spectaNumber } from "./rust-type.ts";
import { attribute, docLines, escape, when } from "./text.ts";
import type { Field } from "./types.ts";

export interface FieldStyle {
  readonly specta: boolean;
  readonly visibility: string;
  readonly indent: string;
  readonly camel: boolean;
}

export const camelCased = (fields: readonly Field[]): boolean =>
  pipe(
    fields,
    Array.some(({ rust, key }) => plainIdentifier(rust) !== key),
  );

const serdeParts =
  (camel: boolean) =>
  (field: Field): readonly string[] => {
    const plain = plainIdentifier(field.rust);
    const expected = Boolean.match(camel, {
      onTrue: () => serdeCamelField(plain),
      onFalse: () => plain,
    });
    return [
      ...when(expected !== field.key)(() => [`rename = "${escape(field.key)}"`]),
      ...when(field.skipNone)(() => ['skip_serializing_if = "Option::is_none"']),
    ];
  };

const spectaParts =
  (style: FieldStyle) =>
  (field: Field): readonly string[] => {
    const override = rustType(spectaNumber(field.ty));
    return when(style.specta && override !== rustType(field.ty))(() => [`type = ${override}`]);
  };

export const fieldLines =
  (style: FieldStyle) =>
  (field: Field): readonly string[] => [
    ...docLines(style.indent)(field.doc),
    ...attribute({ name: "serde", parts: serdeParts(style.camel)(field), indent: style.indent }),
    ...attribute({ name: "specta", parts: spectaParts(style)(field), indent: style.indent }),
    `${style.indent}${style.visibility}${field.rust}: ${rustType(field.ty)},`,
  ];

export const renameAllCamel = (camel: boolean): readonly string[] =>
  when(camel)(() => ['rename_all = "camelCase"']);
