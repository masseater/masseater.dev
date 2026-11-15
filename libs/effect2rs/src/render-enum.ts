import { Array, Boolean, Option, pipe } from "effect";

import { pascalCase, variantRule } from "./names.ts";
import { attribute, docLines, escape } from "./text.ts";
import type { Enumeration } from "./types.ts";

export interface VariantNaming {
  readonly renameAll: readonly string[];
  readonly perVariant: (value: string) => readonly string[];
}

const ruleFor = (values: readonly string[]): Option.Option<Option.Option<string>> => {
  const variants = pipe(
    values,
    Array.map((value) => ({ variant: pascalCase(value), value })),
  );
  const identity = pipe(
    variants,
    Array.every(({ variant, value }) => variant === value),
  );
  return Boolean.match(identity, {
    onTrue: () => Option.some(Option.none()),
    onFalse: () => pipe(variantRule(variants), Option.map(Option.some)),
  });
};

export const variantNaming = (values: readonly string[]): VariantNaming => {
  const rule = ruleFor(values);
  return {
    renameAll: pipe(
      rule,
      Option.flatten,
      Option.map((name) => `rename_all = "${name}"`),
      Option.toArray,
    ),
    perVariant: (value) =>
      Boolean.match(Option.isSome(rule), {
        onTrue: () => [],
        onFalse: () => [`rename = "${escape(value)}"`],
      }),
  };
};

const ARM = "            ";

const asStr = (values: readonly string[]): readonly string[] => [
  "    #[must_use]",
  "    pub const fn as_str(self) -> &'static str {",
  "        match self {",
  ...pipe(
    values,
    Array.map((value) => `${ARM}Self::${pascalCase(value)} => "${escape(value)}",`),
  ),
  "        }",
  "    }",
];

const parse = (values: readonly string[]): readonly string[] => [
  "    #[must_use]",
  "    pub fn parse(value: &str) -> Option<Self> {",
  "        match value {",
  ...pipe(
    values,
    Array.map((value) => `${ARM}"${escape(value)}" => Some(Self::${pascalCase(value)}),`),
  ),
  `${ARM}_ => None,`,
  "        }",
  "    }",
];

const variantLines =
  (naming: VariantNaming) =>
  (value: string): readonly string[] =>
    pipe(
      attribute({ name: "serde", parts: naming.perVariant(value), indent: "    " }),
      Array.append(`    ${pascalCase(value)},`),
    );

export const enumLines =
  (derive: string) =>
  ({ name, doc, values }: Enumeration): readonly string[] => {
    const naming = variantNaming(values);
    return [
      ...docLines("")(doc),
      derive,
      ...attribute({ name: "serde", parts: naming.renameAll, indent: "" }),
      `pub enum ${name} {`,
      ...pipe(values, Array.flatMap(variantLines(naming))),
      "}",
      "",
      `impl ${name} {`,
      ...asStr(values),
      "",
      ...parse(values),
      "}",
    ];
  };
