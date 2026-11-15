import { Array, Boolean, Option, String, pipe } from "effect";

const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "box",
  "break",
  "const",
  "continue",
  "crate",
  "dyn",
  "else",
  "enum",
  "extern",
  "false",
  "fn",
  "for",
  "gen",
  "if",
  "impl",
  "in",
  "let",
  "loop",
  "match",
  "mod",
  "move",
  "mut",
  "pub",
  "ref",
  "return",
  "static",
  "struct",
  "trait",
  "true",
  "try",
  "type",
  "unsafe",
  "use",
  "where",
  "while",
  "yield",
]);

const LOWER_TO_UPPER = /(?<before>[a-z0-9])(?<after>[A-Z])/gu;
const ACRONYM_END = /(?<acronym>[A-Z]+)(?<next>[A-Z][a-z])/gu;
const SEPARATOR = /[^A-Za-z0-9]+/u;
const LEADING_DIGIT = /^[0-9]/u;
const SCREAMING = /^[A-Z][A-Z0-9_]*$/u;
const INNER_UPPER = /(?<!^)(?<upper>[A-Z])/gu;
const RAW_PREFIX = /^r#/u;

const words = (value: string): readonly string[] =>
  pipe(
    value,
    String.replaceAll(LOWER_TO_UPPER, "$<before> $<after>"),
    String.replaceAll(ACRONYM_END, "$<acronym> $<next>"),
    String.split(SEPARATOR),
    Array.filter(String.isNonEmpty),
  );

const withLeadingDigit =
  (prefix: string) =>
  (value: string): string =>
    Boolean.match(LEADING_DIGIT.test(value), {
      onTrue: () => `${prefix}${value}`,
      onFalse: () => value,
    });

const capitalized = (word: string): string => pipe(word, String.toLowerCase, String.capitalize);

export const snakeCase = (value: string): string =>
  pipe(words(value), Array.map(String.toLowerCase), Array.join("_"), withLeadingDigit("_"));

export const pascalCase = (value: string): string =>
  pipe(words(value), Array.map(capitalized), Array.join(""), withLeadingDigit("V"));

export const screamingSnakeCase = (value: string): string =>
  Boolean.match(SCREAMING.test(value), {
    onTrue: () => value,
    onFalse: () => pipe(value, snakeCase, String.toUpperCase),
  });

export const fieldIdentifier = (snake: string): string =>
  Boolean.match(KEYWORDS.has(snake), { onTrue: () => `r#${snake}`, onFalse: () => snake });

export const plainIdentifier = (identifier: string): string =>
  pipe(identifier, String.replace(RAW_PREFIX, ""));

export const serdeCamelField = (field: string): string =>
  pipe(field, String.split("_"), Array.map(String.capitalize), Array.join(""), String.uncapitalize);

const snakeVariant =
  (separator: string) =>
  (variant: string): string =>
    pipe(variant, String.replaceAll(INNER_UPPER, `${separator}$<upper>`), String.toLowerCase);

const VARIANT_RULES: readonly (readonly [string, (variant: string) => string])[] = [
  ["lowercase", String.toLowerCase],
  ["kebab-case", snakeVariant("-")],
  ["snake_case", snakeVariant("_")],
  ["camelCase", String.uncapitalize],
  ["SCREAMING_SNAKE_CASE", (variant) => pipe(variant, snakeVariant("_"), String.toUpperCase)],
  ["UPPERCASE", String.toUpperCase],
];

export type Renamed = Readonly<{ variant: string; value: string }>;

export const variantRule = (variants: readonly Renamed[]): Option.Option<string> =>
  pipe(
    VARIANT_RULES,
    Array.findFirst(([, apply]) =>
      pipe(
        variants,
        Array.every(({ variant, value }) => apply(variant) === value),
      ),
    ),
    Option.map(([rule]) => rule),
  );
