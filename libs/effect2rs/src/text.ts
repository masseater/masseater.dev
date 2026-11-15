import { Array, Boolean, Match, Option, String, pipe } from "effect";

const CONTROL_LIMIT = 0x20;
const HEX = 16;
const FIRST = 0;

const { raw } = globalThis.String;

export const when =
  (condition: boolean) =>
  (lines: () => readonly string[]): readonly string[] =>
    Boolean.match(condition, { onTrue: lines, onFalse: () => [] });

export const docLines =
  (indent: string) =>
  (doc: Option.Option<string>): readonly string[] =>
    pipe(
      doc,
      Option.map((text) =>
        pipe(
          text,
          String.split("\n"),
          Array.map((line) => String.trimEnd(`${indent}/// ${line}`)),
        ),
      ),
      Option.getOrElse((): readonly string[] => []),
    );

const control = (char: string): Option.Option<number> =>
  pipe(
    char,
    String.codePointAt(FIRST),
    Option.filter((point) => point < CONTROL_LIMIT),
  );

const escapeChar = (char: string): string =>
  Match.value(char).pipe(
    Match.when("\\", () => raw`\\`),
    Match.when('"', () => raw`\"`),
    Match.when("\n", () => raw`\n`),
    Match.when("\r", () => raw`\r`),
    Match.when("\t", () => raw`\t`),
    Match.orElse((value) =>
      pipe(
        control(value),
        Option.match({
          onNone: () => value,
          onSome: (point) => `${raw`\u`}{${point.toString(HEX)}}`,
        }),
      ),
    ),
  );

export const escape = (value: string): string =>
  pipe(Array.fromIterable(value), Array.map(escapeChar), Array.join(""));

export interface Attribute {
  readonly name: string;
  readonly parts: readonly string[];
  readonly indent: string;
}

export const attribute = ({ name, parts, indent }: Attribute): readonly string[] =>
  when(Array.isReadonlyArrayNonEmpty(parts))(() => [
    `${indent}#[${name}(${pipe(parts, Array.join(", "))})]`,
  ]);
