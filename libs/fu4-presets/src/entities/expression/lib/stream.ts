import { Option, pipe } from "effect";

import type { ExprError, Token, TokenKind } from "#/entities/expression/model/ast.ts";

import { ORIGIN } from "./cursor.ts";
import type { Cursor } from "./cursor.ts";
import type { Lexed } from "./lexed.ts";
import { nextToken } from "./lexer.ts";

export interface Stream {
  readonly current: () => Token;
  readonly peek: () => TokenKind;
  readonly next: () => Token;
  readonly fail: (message: string) => void;
  readonly failed: () => boolean;
  readonly lexError: () => Option.Option<ExprError>;
  readonly parseError: () => Option.Option<ExprError>;
  readonly offset: () => number;
  readonly drain: () => readonly TokenKind[];
}

interface State {
  cur: Lexed;
  lexError: Option.Option<ExprError>;
  parseError: Option.Option<ExprError>;
}

const firstOf = (seen: Option.Option<ExprError>, lexed: Lexed): Option.Option<ExprError> =>
  pipe(
    seen,
    Option.orElse(() => Option.fromNullishOr(lexed.error)),
  );

const errorAt = (token: Token, message: string): ExprError => ({
  message,
  line: token.line,
  column: token.column,
});

export const streamOf = (src: string): Stream => {
  const lex = nextToken(src);
  const first = lex(ORIGIN);
  const state: State = {
    cur: first,
    lexError: Option.fromNullishOr(first.error),
    parseError: Option.none(),
  };
  const advanceFrom = (end: Cursor): Token => {
    const previous = state.cur.token;
    state.cur = lex(end);
    state.lexError = firstOf(state.lexError, state.cur);
    return previous;
  };
  return {
    current: () => state.cur.token,
    peek: () => state.cur.token.kind,
    next: () => advanceFrom(state.cur.end),
    fail: (message) => {
      state.parseError = pipe(
        state.parseError,
        Option.orElse(() => Option.some(errorAt(state.cur.token, message))),
      );
    },
    failed: () => Option.isSome(state.parseError),
    lexError: () => state.lexError,
    parseError: () => state.parseError,
    offset: () => state.cur.end.offset,
    drain: () => {
      const kinds: TokenKind[] = [];
      for (
        state.cur = lex(state.cur.end);
        state.cur.token.kind !== "END";
        state.cur = lex(state.cur.end)
      ) {
        kinds.push(state.cur.token.kind);
      }
      return kinds;
    },
  };
};
