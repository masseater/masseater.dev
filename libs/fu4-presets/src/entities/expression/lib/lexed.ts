import { Option, Result } from "effect";

import type { ExprError, Token, TokenKind } from "#/entities/expression/model/ast.ts";
import { quoteChar } from "#/shared/text/index.ts";

import { advance, isChar, isDigit, peek, tokenAt } from "./cursor.ts";
import type { Cursor, Scan } from "./cursor.ts";

export interface Lexed {
  readonly token: Token;
  readonly end: Cursor;
  readonly error?: ExprError;
}

export interface Unexpected {
  readonly at: Cursor;
  readonly place: string;
  readonly expected: string;
}

export const PUNCT =
  "''', '}', '(', ')', '[', ']', '.', '!', '<', '>', '=', '&', '|', '*', ',', ' '";
export const DIGITS = "'0'..'9'";
const DOUBLE_QUOTE = '"';
const DOUBLE_QUOTE_NOTE =
  ". do you mean string literals? only single quotes are available for string delimiter";

export const eof = (scan: Scan): Token => ({
  kind: "END",
  value: "",
  line: scan.start.line,
  column: scan.start.column,
});

const describe = (char: Option.Option<string>): string =>
  Option.match(char, { onNone: () => "EOF", onSome: (found) => `character ${quoteChar(found)}` });

const noteOf = (char: Option.Option<string>): string => {
  if (isChar(DOUBLE_QUOTE)(char)) {
    return DOUBLE_QUOTE_NOTE;
  }
  return "";
};

export const unexpected =
  (scan: Scan) =>
  ({ at, place, expected }: Unexpected): Lexed => {
    const char = peek(scan.src)(at);
    return {
      token: eof(scan),
      end: at,
      error: {
        message: `got unexpected ${describe(char)} while lexing ${place}, expecting ${expected}${noteOf(char)}`,
        line: at.line,
        column: at.column,
      },
    };
  };

export const finished =
  (scan: Scan) =>
  (kind: TokenKind, end: Cursor): Lexed => ({ token: tokenAt(scan)(kind, end), end });

export const skipWhile =
  (test: (char: Option.Option<string>) => boolean) =>
  (src: string) =>
  (from: Cursor): Cursor => {
    let at = from;
    while (test(peek(src)(at))) {
      at = advance(src)(at);
    }
    return at;
  };

export const digitsFrom =
  (place: string) =>
  (scan: Scan) =>
  (at: Cursor): Result.Result<Cursor, Lexed> => {
    if (!isDigit(peek(scan.src)(at))) {
      return Result.fail(unexpected(scan)({ at, place, expected: DIGITS }));
    }
    return Result.succeed(skipWhile(isDigit)(scan.src)(at));
  };

export const optionally =
  (char: string) =>
  (scan: Scan) =>
  (at: Cursor): Cursor => {
    if (isChar(char)(peek(scan.src)(at))) {
      return advance(scan.src)(at);
    }
    return at;
  };
