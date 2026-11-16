import { Array, Boolean, Option, String, pipe } from "effect";

const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "box",
  "break",
  "const",
  "continue",
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
const TRAILING_UNDERSCORES = /_+$/u;

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
  pipe(words(value), Array.map(String.toLowerCase), Array.join("_"), withLeadingDigit("field_"));

const pascalCase = (value: string): string =>
  pipe(words(value), Array.map(capitalized), Array.join(""), withLeadingDigit("V"));

export const screamingSnakeCase = (value: string): string =>
  Boolean.match(SCREAMING.test(value), {
    onTrue: () => value,
    onFalse: () => pipe(value, snakeCase, String.toUpperCase),
  });

export const plainIdentifier = (identifier: string): string =>
  pipe(identifier, String.replace(RAW_PREFIX, ""));

const UNRAWABLE = new Set(["self", "super", "crate", "Self"]);
const FIRST_SUFFIX = 2;
const NEXT = 1;

const orFallback =
  (fallback: string) =>
  (value: string): string =>
    Boolean.match(String.isNonEmpty(value), { onTrue: () => value, onFalse: () => fallback });

const awayFromKeywords =
  (suffix: string) =>
  (value: string): string =>
    Boolean.match(UNRAWABLE.has(value), {
      onTrue: () => `${value}${suffix}`,
      onFalse: () => value,
    });

export const fieldIdentifier = (snake: string): string => {
  const safe = pipe(snake, orFallback("value"), awayFromKeywords("_"));
  return Boolean.match(KEYWORDS.has(safe), { onTrue: () => `r#${safe}`, onFalse: () => safe });
};

export const variantIdentifier = (value: string): string =>
  pipe(pascalCase(value), orFallback("Value"), awayFromKeywords("Value"));

const firstFree =
  (taken: readonly string[]) =>
  (separator: string) =>
  (name: string) =>
  (suffix: number): string => {
    const candidate = Boolean.match(suffix === FIRST_SUFFIX - NEXT, {
      onTrue: () => name,
      onFalse: () =>
        `${pipe(name, String.replace(TRAILING_UNDERSCORES, ""))}${separator}${globalThis.String(suffix)}`,
    });
    const used = pipe(taken, Array.contains(plainIdentifier(candidate)));
    return Boolean.match(used, {
      onTrue: () => firstFree(taken)(separator)(name)(Math.max(suffix + NEXT, FIRST_SUFFIX)),
      onFalse: () => candidate,
    });
  };

const distinctFrom =
  (separator: string) =>
  (taken: readonly string[]) =>
  (names: readonly string[]): readonly string[] =>
    pipe(
      names,
      Array.match({
        onEmpty: (): readonly string[] => [],
        onNonEmpty: ([name, ...rest]) => {
          const chosen = firstFree(taken)(separator)(name)(FIRST_SUFFIX - NEXT);
          return [chosen, ...distinctFrom(separator)([...taken, plainIdentifier(chosen)])(rest)];
        },
      }),
    );

export const distinct = (separator: string): ((names: readonly string[]) => readonly string[]) =>
  distinctFrom(separator)([]);

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
