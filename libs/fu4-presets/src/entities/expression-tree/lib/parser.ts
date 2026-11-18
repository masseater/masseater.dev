import { Array as Arr, Option, Result, pipe } from "effect";

import type {
  BinaryOp,
  Expr,
  FunctionName,
  Literal,
  Spanned,
} from "#/entities/expression-tree/model/types.ts";

import { checkArity, functionOf } from "./call.ts";
import { lex } from "./lexer.ts";
import type { Token } from "./lexer.ts";
import {
  BINARY,
  BUDGET,
  LITERALS,
  LOWEST,
  NEXT,
  START,
  advanced,
  cursorOf,
  failure,
  nested,
  stepOf,
} from "./parser-core.ts";
import type { At, Context, ParseError, Parsed, Step } from "./parser-core.ts";
import { postfixOf } from "./parser-parts.ts";

interface Args {
  readonly args: readonly Spanned[];
  readonly end: number;
}

const closeArgs = (context: Context, at: At, args: readonly Spanned[]): Parsed<Args> =>
  pipe(
    context.bump(at),
    Result.map((close) => stepOf({ args, end: close.value.end }, close.at)),
  );

const restArgs =
  (context: Context) =>
  (at: At, args: readonly Spanned[]): Parsed<Args> => {
    if (context.isAt(at, ")")) {
      return closeArgs(context, at, args);
    }
    return pipe(
      nested(at, (inner) => context.expr(inner, LOWEST)),
      Result.flatMap((arg) => {
        const collected = Arr.append(args, arg.value);
        if (context.isAt(arg.at, ")")) {
          return closeArgs(context, arg.at, collected);
        }
        return pipe(
          context.expect(",", "expected `,` or `)`")(arg.at),
          Result.flatMap((comma) => restArgs(context)(comma.at, collected)),
        );
      }),
    );
  };

const callOf = (name: string, count: number): Result.Result<FunctionName, ParseError> =>
  Result.fromOption(
    Option.filter(functionOf(name), (func) => Option.isNone(checkArity(func)(count))),
    () => ({ message: "Invalid function call" }),
  );

const parseCall = (context: Context, at: At, name: Token): Parsed<Spanned> =>
  pipe(
    context.bump(at),
    Result.flatMap((open) => restArgs(context)(open.at, [])),
    Result.flatMap(({ value: { args, end }, at: after }) =>
      pipe(
        callOf(name.text, args.length),
        Result.map((func) =>
          stepOf(context.spanned(name.start, end, { type: "call", func, args }), after),
        ),
      ),
    ),
  );

const literalOf = (context: Context, token: Token): Option.Option<Literal> => {
  if (token.tok === "number") {
    return Option.some({ kind: "number", value: token.value });
  }
  if (token.tok === "string") {
    return Option.some({ kind: "string", value: context.stringValue(token) });
  }
  return Option.fromNullishOr(LITERALS[token.tok]);
};

const parseGroup = (context: Context, at: At, open: Token): Parsed<Spanned> =>
  pipe(
    nested(advanced(at), (inner) => context.expr(inner, LOWEST)),
    Result.flatMap((inner) =>
      pipe(
        context.expect(")", "expected `)`")(inner.at),
        Result.map((close) =>
          stepOf(context.spanned(open.start, close.value.end, inner.value.expr), close.at),
        ),
      ),
    ),
  );

const parseIdentifier = (context: Context, at: At, token: Token): Parsed<Spanned> => {
  const after = advanced(at);
  if (context.isAt(after, "(")) {
    return parseCall(context, after, token);
  }
  return Result.succeed(
    stepOf(
      context.spanned(token.start, token.end, { type: "identifier", name: token.text }),
      after,
    ),
  );
};

interface Primary {
  readonly head: Spanned;
  readonly accessible: boolean;
}

const accessible =
  (accessibleHead: boolean) =>
  (step: Step<Spanned>): Step<Primary> =>
    stepOf({ head: step.value, accessible: accessibleHead }, step.at);

const parseToken = (context: Context, at: At, token: Token): Parsed<Primary> => {
  const literal = literalOf(context, token);
  if (Option.isSome(literal)) {
    const expr: Expr = { type: "literal", literal: literal.value };
    return Result.succeed(
      stepOf(
        { head: context.spanned(token.start, token.end, expr), accessible: false },
        advanced(at),
      ),
    );
  }
  if (token.tok === "(") {
    return Result.map(accessible(true))(parseGroup(context, at, token));
  }
  if (token.tok === "ident") {
    return Result.map(accessible(true))(parseIdentifier(context, at, token));
  }
  return failure("expected an expression");
};

const parsePrimary = (context: Context, at: At): Parsed<Primary> =>
  pipe(
    Result.fromOption(context.peek(at), () => ({ message: "unexpected end of expression" })),
    Result.flatMap((token) => parseToken(context, at, token)),
  );

const parsePostfix = (context: Context, at: At): Parsed<Spanned> =>
  pipe(
    parsePrimary(context, at),
    Result.flatMap(({ value: { head, accessible: open }, at: after }) => {
      if (!open) {
        return Result.succeed(stepOf(head, after));
      }
      return postfixOf(context)(head, after);
    }),
  );

const parseUnary = (context: Context, at: At): Parsed<Spanned> =>
  Option.match(
    Option.filter(context.peek(at), (token) => token.tok === "!"),
    {
      onNone: () => parsePostfix(context, at),
      onSome: (bang) =>
        Result.map(
          nested(advanced(at), (inner) => parseUnary(context, inner)),
          (inner) =>
            stepOf(
              context.spanned(bang.start, inner.value.origin.end, {
                type: "not",
                inner: inner.value,
              }),
              inner.at,
            ),
        ),
    },
  );

const binaryAt = (
  context: Context,
  at: At,
  minimum: number,
): Option.Option<readonly [BinaryOp, number]> =>
  pipe(
    context.peek(at),
    Option.flatMap((token) => Option.fromNullishOr(BINARY[token.tok])),
    Option.filter(([, power]) => power >= minimum),
  );

const climb =
  (context: Context, minimum: number) =>
  (lhs: Step<Spanned>): Parsed<Spanned> =>
    Option.match(binaryAt(context, lhs.at, minimum), {
      onNone: () => Result.succeed(lhs),
      onSome: ([op, power]) =>
        pipe(
          nested(advanced(lhs.at), (inner) => context.expr(inner, power + NEXT)),
          Result.flatMap((rhs) => {
            const expr: Expr = { type: "binary", lhs: lhs.value, op, rhs: rhs.value };
            const joined = context.spanned(lhs.value.origin.start, rhs.value.origin.end, expr);
            return climb(context, minimum)(stepOf(joined, rhs.at));
          }),
        ),
    });

const parseExpr = (context: Context, at: At, minimum: number): Parsed<Spanned> =>
  pipe(parseUnary(context, at), Result.flatMap(climb(context, minimum)));

const contextFor = (src: string, tokens: readonly Token[]): Context => {
  const context: Context = {
    ...cursorOf(src)(tokens),
    expr: (at, minimum) => parseExpr(context, at, minimum),
  };
  return context;
};

const parseAll = (context: Context): Result.Result<Spanned, ParseError> => {
  const at: At = { pos: START, depth: BUDGET };
  if (Option.isNone(context.peek(at))) {
    return Result.fail({ message: "empty expression" });
  }
  return pipe(
    nested(at, (inner) => context.expr(inner, LOWEST)),
    Result.flatMap((step) => {
      if (Option.isSome(context.peek(step.at))) {
        return Result.fail({ message: "unexpected trailing input" });
      }
      return Result.succeed(step.value);
    }),
  );
};

export const parseExpression = (src: string): Result.Result<Spanned, ParseError> =>
  pipe(
    lex(src),
    Result.mapError((issue): ParseError => ({ message: issue.message })),
    Result.flatMap((tokens) => parseAll(contextFor(src, tokens))),
  );
