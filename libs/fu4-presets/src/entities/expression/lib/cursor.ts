import { Option, String as Str, pipe } from "effect";

import type { Token, TokenKind } from "#/entities/expression/model/ast.ts";

export interface Cursor {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface Scan {
  readonly src: string;
  readonly start: Cursor;
}

const FIRST = 1;
const NEWLINE = "\n";

export const ORIGIN: Cursor = { offset: 0, line: FIRST, column: FIRST };

export const peek =
  (src: string) =>
  (at: Cursor): Option.Option<string> =>
    pipe(
      Str.codePointAt(at.offset)(src),
      Option.map((point) => String.fromCodePoint(point)),
    );

const after = (at: Cursor, char: string): Cursor => {
  if (char === NEWLINE) {
    return { offset: at.offset + char.length, line: at.line + FIRST, column: FIRST };
  }
  return { offset: at.offset + char.length, line: at.line, column: at.column + FIRST };
};

export const advance =
  (src: string) =>
  (at: Cursor): Cursor =>
    pipe(peek(src)(at), Option.match({ onNone: () => at, onSome: (char) => after(at, char) }));

export const isChar =
  (expected: string) =>
  (char: Option.Option<string>): boolean =>
    Option.exists(char, (found) => found === expected);

const tested =
  (pattern: RegExp) =>
  (char: Option.Option<string>): boolean =>
    Option.exists(char, (found) => pattern.test(found));

export const isAlpha = tested(/^[A-Za-z]$/u);
export const isDigit = tested(/^\d$/u);
export const isHex = tested(/^[\dA-Fa-f]$/u);
export const isAlnum = tested(/^[\dA-Za-z]$/u);

export const textOf =
  (scan: Scan) =>
  (end: Cursor): string =>
    Str.slice(scan.start.offset, end.offset)(scan.src);

export const tokenAt =
  (scan: Scan) =>
  (kind: TokenKind, end: Cursor): Token => ({
    kind,
    value: textOf(scan)(end),
    line: scan.start.line,
    column: scan.start.column,
  });
