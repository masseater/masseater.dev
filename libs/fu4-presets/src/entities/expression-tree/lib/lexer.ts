import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import { parseNumber } from "./number.ts";

export type Tok =
  | "("
  | ")"
  | "["
  | "]"
  | ","
  | "."
  | "*"
  | "!"
  | "!="
  | "=="
  | ">"
  | ">="
  | "<"
  | "<="
  | "&&"
  | "||"
  | "number"
  | "string"
  | "ident"
  | "true"
  | "false"
  | "null";

export interface Token {
  readonly tok: Tok;
  readonly start: number;
  readonly end: number;
  readonly value: number;
  readonly text: string;
}

export interface LexError {
  readonly message: string;
  readonly offset: number;
}

type Lexed = Result.Result<Token, LexError>;

const NEXT = 1;
const PAIR = 2;
const NO_VALUE = 0;
const QUOTE = "'";

const WHITESPACE = new Set([" ", "\t", "\n", "\f", "\r"]);
const BOUNDARY = new Set(["(", ")", "[", "]", ",", ".", "!", "<", ">", "=", "&", "|"]);
const SINGLE: ReadonlyMap<string, Tok> = new Map<string, Tok>([
  ["(", "("],
  [")", ")"],
  ["[", "["],
  ["]", "]"],
  [",", ","],
  ["*", "*"],
]);
const PAIRED: Readonly<Record<string, readonly [Tok, Tok | "error", string]>> = {
  "!": ["!=", "!", ""],
  "<": ["<=", "<", ""],
  ">": [">=", ">", ""],
  "=": ["==", "error", "expected `==`"],
  "&": ["&&", "error", "expected `&&`"],
  "|": ["||", "error", "expected `||`"],
};
const DOT_AFTER = new Set<Tok>(["ident", "]", ")", "*"]);
const NUMBER_START = /^[.+\-0-9]$/u;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_-]*$/u;
const KEYWORDS: Readonly<Record<string, Tok>> = { true: "true", false: "false", null: "null" };
const SPECIAL_NUMBERS: Readonly<Record<string, number>> = {
  NaN: Number.NaN,
  Infinity: Number.POSITIVE_INFINITY,
};

const charAt =
  (src: string) =>
  (index: number): string =>
    Option.getOrElse(Str.charAt(index)(src), () => "");

const isBoundary = (char: string): boolean => WHITESPACE.has(char) || BOUNDARY.has(char);

const simple = (tok: Tok, start: number, end: number): Token => ({
  tok,
  start,
  end,
  value: NO_VALUE,
  text: "",
});

const runEnd = (src: string, from: number, keep: (char: string) => boolean): number => {
  let end = from;
  while (end < src.length && keep(charAt(src)(end))) {
    end += NEXT;
  }
  return end;
};

const stringEnd = (src: string, start: number): Option.Option<number> => {
  const at = charAt(src);
  let index = start + NEXT;
  while (index < src.length) {
    if (at(index) === QUOTE && at(index + NEXT) === QUOTE) {
      index += PAIR;
    } else if (at(index) === QUOTE) {
      return Option.some(index + NEXT);
    } else {
      index += NEXT;
    }
  }
  return Option.none();
};

const lexString = (src: string, start: number): Lexed =>
  Result.fromOption(
    Option.map(stringEnd(src, start), (end) => simple("string", start, end)),
    () => ({ message: "unterminated string literal", offset: start }),
  );

const lexNumber = (src: string, start: number): Lexed => {
  const end = runEnd(src, start, (char) => !isBoundary(char) || char === ".");
  const value = parseNumber(Str.slice(start, end)(src));
  if (Number.isNaN(value)) {
    return Result.fail({ message: "invalid numeric literal", offset: start });
  }
  return Result.succeed({ tok: "number", start, end, value, text: "" });
};

const keywordToken = (lexeme: string, start: number, end: number): Token => {
  const keyword = Option.fromNullishOr(KEYWORDS[lexeme]);
  if (Option.isSome(keyword)) {
    return simple(keyword.value, start, end);
  }
  const special = Option.fromNullishOr(SPECIAL_NUMBERS[lexeme]);
  if (Option.isSome(special)) {
    return { tok: "number", start, end, value: special.value, text: "" };
  }
  return { tok: "ident", start, end, value: NO_VALUE, text: lexeme };
};

const lexIdentifier = (src: string, start: number, previous: Option.Option<Tok>): Lexed => {
  const end = runEnd(src, start, (char) => !isBoundary(char));
  const lexeme = Str.slice(start, end)(src);
  if (!IDENTIFIER.test(lexeme)) {
    return Result.fail({ message: "unexpected symbol", offset: start });
  }
  if (Option.contains(previous, ".")) {
    return Result.succeed({ tok: "ident", start, end, value: NO_VALUE, text: lexeme });
  }
  return Result.succeed(keywordToken(lexeme, start, end));
};

const lexPaired = (src: string, start: number): Option.Option<Lexed> =>
  pipe(
    Option.fromNullishOr(PAIRED[charAt(src)(start)]),
    Option.map(([double, single, message]): Lexed => {
      if (charAt(src)(start + NEXT) === charAt(double)(NEXT)) {
        return Result.succeed(simple(double, start, start + PAIR));
      }
      if (single === "error") {
        return Result.fail({ message, offset: start });
      }
      return Result.succeed(simple(single, start, start + NEXT));
    }),
  );

const lexDot = (start: number, previous: Option.Option<Tok>): Option.Option<Lexed> =>
  Option.map(
    pipe(
      previous,
      Option.filter((tok) => DOT_AFTER.has(tok)),
    ),
    () => Result.succeed(simple(".", start, start + NEXT)),
  );

const lexSymbol = (
  src: string,
  start: number,
  previous: Option.Option<Tok>,
): Option.Option<Lexed> => {
  const char = charAt(src)(start);
  return pipe(
    Option.fromNullishOr(SINGLE.get(char)),
    Option.map((tok) => Result.succeed(simple(tok, start, start + NEXT))),
    Option.orElse(() => lexPaired(src, start)),
    Option.orElse(() =>
      Option.map(
        Option.liftPredicate(char, (each) => each === QUOTE),
        () => lexString(src, start),
      ),
    ),
    Option.orElse(() =>
      Option.flatMap(
        Option.liftPredicate(char, (each) => each === "."),
        () => lexDot(start, previous),
      ),
    ),
  );
};

const lexOne = (src: string, start: number, previous: Option.Option<Tok>): Lexed =>
  Option.getOrElse(lexSymbol(src, start, previous), () => {
    if (NUMBER_START.test(charAt(src)(start))) {
      return lexNumber(src, start);
    }
    return lexIdentifier(src, start, previous);
  });

export const lex = (src: string): Result.Result<readonly Token[], LexError> => {
  const tokens: Token[] = [];
  for (let start = runEnd(src, NO_VALUE, (char) => WHITESPACE.has(char)); start < src.length;) {
    const previous = Option.map(Arr.last(tokens), (token) => token.tok);
    const result = lexOne(src, start, previous);
    if (Result.isFailure(result)) {
      return Result.fail(result.failure);
    }
    tokens.push(result.success);
    start = runEnd(src, result.success.end, (char) => WHITESPACE.has(char));
  }
  return Result.succeed(tokens);
};
