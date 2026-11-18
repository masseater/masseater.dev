import { Option, Record as Rec, pipe } from "effect";

import type { TokenKind } from "#/entities/expression/model/ast.ts";
import { quoteChar } from "#/shared/text/index.ts";

import { advance, isAlnum, isAlpha, isChar, isDigit, peek } from "./cursor.ts";
import type { Cursor, Scan } from "./cursor.ts";
import { DIGITS, PUNCT, eof, finished, skipWhile, unexpected } from "./lexed.ts";
import type { Lexed } from "./lexed.ts";
import { lexNum } from "./number.ts";

interface Pair {
  readonly second: string;
  readonly double: TokenKind;
  readonly single?: TokenKind;
  readonly place: string;
}

const ALPHA = "'a'..'z', 'A'..'Z', '_'";
const WHITE = /^[\t\n\r ]$/u;
const QUOTE = "'";
const SINGLE: Readonly<Record<string, TokenKind>> = {
  "(": "(",
  ")": ")",
  "[": "[",
  "]": "]",
  ".": ".",
  "*": "*",
  ",": ",",
};

const PAIRS: Readonly<Record<string, Pair>> = {
  "}": { second: "}", double: "END", place: "end marker }}" },
  "!": { second: "=", double: "!=", single: "!", place: "" },
  "<": { second: "=", double: "<=", single: "<", place: "" },
  ">": { second: "=", double: ">=", single: ">", place: "" },
  "=": { second: "=", double: "==", place: "== operator" },
  "&": { second: "&", double: "&&", place: "&& operator" },
  "|": { second: "|", double: "||", place: "|| operator" },
};

const isIdentChar = (char: Option.Option<string>): boolean =>
  isAlnum(char) || isChar("_")(char) || isChar("-")(char);

const lexIdent = (scan: Scan): Lexed =>
  finished(scan)("IDENT", skipWhile(isIdentChar)(scan.src)(advance(scan.src)(scan.start)));

const lexString = (scan: Scan): Lexed => {
  let at = advance(scan.src)(scan.start);
  for (;;) {
    const char = peek(scan.src)(at);
    if (Option.isNone(char)) {
      return unexpected(scan)({ at, place: "end of string literal", expected: "'''" });
    }
    at = advance(scan.src)(at);
    if (isChar(QUOTE)(char) && !isChar(QUOTE)(peek(scan.src)(at))) {
      return finished(scan)("STRING", at);
    }
    if (isChar(QUOTE)(char)) {
      at = advance(scan.src)(at);
    }
  }
};

const lexPair = (scan: Scan, pair: Pair): Lexed => {
  const at = advance(scan.src)(scan.start);
  if (isChar(pair.second)(peek(scan.src)(at))) {
    return finished(scan)(pair.double, advance(scan.src)(at));
  }
  return pipe(
    Option.fromNullishOr(pair.single),
    Option.match({
      onNone: () => unexpected(scan)({ at, place: pair.place, expected: quoteChar(pair.second) }),
      onSome: (kind) => finished(scan)(kind, at),
    }),
  );
};

const lexPunct = (scan: Scan, char: string): Lexed => {
  const single = Rec.get(SINGLE, char);
  if (Option.isSome(single)) {
    return finished(scan)(single.value, advance(scan.src)(scan.start));
  }
  return pipe(
    Rec.get(PAIRS, char),
    Option.match({
      onNone: () =>
        unexpected(scan)({
          at: scan.start,
          place: "expression",
          expected: `${ALPHA}, ${DIGITS}, ${PUNCT}`,
        }),
      onSome: (pair) => lexPair(scan, pair),
    }),
  );
};

const lexAt = (scan: Scan, char: string): Lexed => {
  const found = Option.some(char);
  if (isAlpha(found) || char === "_") {
    return lexIdent(scan);
  }
  if (isDigit(found) || char === "-") {
    return lexNum(scan);
  }
  if (char === QUOTE) {
    return lexString(scan);
  }
  return lexPunct(scan, char);
};

const endOfInput = (scan: Scan): Lexed => ({
  token: eof(scan),
  end: scan.start,
  error: {
    message: "unexpected EOF while lexing expression",
    line: scan.start.line,
    column: scan.start.column,
  },
});

const isWhite = (char: Option.Option<string>): boolean =>
  Option.exists(char, (found) => WHITE.test(found));

const skipWhite = skipWhile(isWhite);

export const nextToken =
  (src: string) =>
  (from: Cursor): Lexed => {
    const start = skipWhite(src)(from);
    const scan: Scan = { src, start };
    return Option.match(peek(src)(start), {
      onNone: () => endOfInput(scan),
      onSome: (char) => lexAt(scan, char),
    });
  };
