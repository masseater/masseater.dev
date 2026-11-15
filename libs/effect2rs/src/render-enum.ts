import { Array, Boolean, Option, pipe } from "effect";

import { distinct, variantIdentifier, variantRule } from "./names.ts";
import type { Renamed } from "./names.ts";
import { attribute, docLines, escape } from "./text.ts";
import type { Enumeration } from "./types.ts";

export interface VariantNaming {
  readonly renameAll: readonly string[];
  readonly perVariant: (value: string) => readonly string[];
}

export const variantsOf = (values: readonly string[]): readonly Renamed[] => {
  const names = pipe(values, Array.map(variantIdentifier), distinct(""));
  return pipe(
    values,
    Array.zipWith(names, (value, variant) => ({ variant, value })),
  );
};

const ruleFor = (variants: readonly Renamed[]): Option.Option<Option.Option<string>> => {
  const identity = pipe(
    variants,
    Array.every(({ variant, value }) => variant === value),
  );
  return Boolean.match(identity, {
    onTrue: () => Option.some(Option.none()),
    onFalse: () => pipe(variantRule(variants), Option.map(Option.some)),
  });
};

export const variantNaming = (variants: readonly Renamed[]): VariantNaming => {
  const rule = ruleFor(variants);
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

const asStr = (variants: readonly Renamed[]): readonly string[] => [
  "    #[must_use]",
  "    pub const fn as_str(self) -> &'static str {",
  "        match self {",
  ...pipe(
    variants,
    Array.map(({ variant, value }) => `${ARM}Self::${variant} => "${escape(value)}",`),
  ),
  "        }",
  "    }",
];

const parse = (variants: readonly Renamed[]): readonly string[] => [
  "    #[must_use]",
  "    pub fn parse(value: &str) -> Option<Self> {",
  "        match value {",
  ...pipe(
    variants,
    Array.map(({ variant, value }) => `${ARM}"${escape(value)}" => Some(Self::${variant}),`),
  ),
  `${ARM}_ => None,`,
  "        }",
  "    }",
];

const variantLines =
  (naming: VariantNaming) =>
  ({ variant, value }: Renamed): readonly string[] =>
    pipe(
      attribute({ name: "serde", parts: naming.perVariant(value), indent: "    " }),
      Array.append(`    ${variant},`),
    );

export const enumLines =
  (derive: string) =>
  ({ name, doc, values }: Enumeration): readonly string[] => {
    const variants = variantsOf(values);
    const naming = variantNaming(variants);
    return [
      ...docLines("")(doc),
      derive,
      ...attribute({ name: "serde", parts: naming.renameAll, indent: "" }),
      `pub enum ${name} {`,
      ...pipe(variants, Array.flatMap(variantLines(naming))),
      "}",
      "",
      `impl ${name} {`,
      ...asStr(variants),
      "",
      ...parse(variants),
      "}",
    ];
  };
