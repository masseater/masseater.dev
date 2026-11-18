import { Array as Arr, Function as Fn, Option, Result, String as Str, pipe } from "effect";

import type { BinaryOp, Literal, Spanned, Expr } from "#/entities/expression-tree/model/types.ts";

import type { Tok, Token } from "./lexer.ts";

export interface ParseError {
  readonly message: string;
}

export interface Cursor {
  readonly peek: (at: At) => Option.Option<Token>;
  readonly isAt: (at: At, tok: Tok) => boolean;
  readonly bump: (at: At) => Parsed<Token>;
  readonly expect: (tok: Tok, message: string) => (at: At) => Parsed<Token>;
  readonly spanned: (start: number, end: number, expr: Expr) => Spanned;
  readonly stringValue: (token: Token) => string;
}

export interface Context extends Cursor {
  readonly expr: (at: At, minimum: number) => Parsed<Spanned>;
}

export interface At {
  readonly pos: number;
  readonly depth: number;
}

export interface Step<Value> {
  readonly value: Value;
  readonly at: At;
}

export type Parsed<Value> = Result.Result<Step<Value>, ParseError>;

export const BUDGET = 50;
const DATA_FIRST = 2;
export const NEXT = 1;
export const START = 0;
export const LOWEST = 0;
const QUOTE_WIDTH = 1;
export const OR = 1;
export const AND = 2;
export const EQUALITY = 3;
export const COMPARISON = 4;
export const BINARY: Partial<Readonly<Record<Tok, readonly [BinaryOp, number]>>> = {
  "||": ["or", OR],
  "&&": ["and", AND],
  "==": ["eq", EQUALITY],
  "!=": ["neq", EQUALITY],
  ">": ["gt", COMPARISON],
  ">=": ["ge", COMPARISON],
  "<": ["lt", COMPARISON],
  "<=": ["le", COMPARISON],
};
export const LITERALS: Partial<Readonly<Record<Tok, Literal>>> = {
  true: { kind: "boolean", value: true },
  false: { kind: "boolean", value: false },
  null: { kind: "null" },
};

export const stepOf: {
  (at: At): <Value>(value: Value) => Step<Value>;
  <Value>(value: Value, at: At): Step<Value>;
} = Fn.dual(DATA_FIRST, <Value>(value: Value, at: At): Step<Value> => ({ value, at }));

const deeper = (at: At): Result.Result<At, ParseError> => {
  if (at.depth === LOWEST) {
    return Result.fail({ message: "expression exceeds maximum recursion depth" });
  }
  return Result.succeed({ pos: at.pos, depth: at.depth - NEXT });
};

const restored =
  (depth: number) =>
  <Value>(step: Step<Value>): Step<Value> =>
    stepOf(step.value, { pos: step.at.pos, depth });

export const nested: {
  <Value>(parse: (inner: At) => Parsed<Value>): (at: At) => Parsed<Value>;
  <Value>(at: At, parse: (inner: At) => Parsed<Value>): Parsed<Value>;
} = Fn.dual(DATA_FIRST, <Value>(at: At, parse: (inner: At) => Parsed<Value>): Parsed<Value> =>
  pipe(deeper(at), Result.flatMap(parse), Result.map(restored(at.depth))),
);

export const failure = <Value>(message: string): Parsed<Value> => Result.fail({ message });

export const advanced = (at: At): At => ({ pos: at.pos + NEXT, depth: at.depth });

const spannedIn =
  (src: string) =>
  (start: number, end: number, expr: Expr): Spanned => ({
    origin: { start, end, raw: Str.trim(Str.slice(start, end)(src)) },
    expr,
  });

const quotedIn =
  (src: string) =>
  (token: Token): string =>
    Str.slice(token.start + QUOTE_WIDTH, token.end - QUOTE_WIDTH)(src);

const END = { message: "unexpected end of expression" };

export const cursorOf =
  (src: string) =>
  (tokens: readonly Token[]): Cursor => {
    const peek = (at: At): Option.Option<Token> => Arr.get(tokens, at.pos);
    const isAt = (at: At, tok: Tok): boolean =>
      Option.exists(peek(at), (token) => token.tok === tok);
    const bump = (at: At): Parsed<Token> =>
      Result.fromOption(
        Option.map(peek(at), (token) => ({ value: token, at: advanced(at) })),
        () => END,
      );
    const expect =
      (tok: Tok, message: string) =>
      (at: At): Parsed<Token> => {
        if (!isAt(at, tok)) {
          return failure(message);
        }
        return bump(at);
      };
    const spanned = spannedIn(src);
    const quoted = quotedIn(src);
    const stringValue = (token: Token): string => Str.replaceAll("''", "'")(quoted(token));
    return { peek, isAt, bump, expect, spanned, stringValue };
  };
