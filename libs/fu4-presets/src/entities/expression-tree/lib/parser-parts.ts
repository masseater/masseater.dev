import { Array as Arr, Option, Result, pipe } from "effect";

import type { Expr, Spanned } from "#/entities/expression-tree/model/types.ts";

import type { Token } from "./lexer.ts";
import { LOWEST, NEXT, advanced, failure, nested, stepOf } from "./parser-core.ts";
import type { At, Context, Parsed, Step } from "./parser-core.ts";

const tokenSpan =
  (context: Context, exprOf: (token: Token) => Expr) =>
  (step: Step<Token>): Step<Spanned> =>
    stepOf(context.spanned(step.value.start, step.value.end, exprOf(step.value)), step.at);

const identifierOf = (token: Token): Expr => ({ type: "identifier", name: token.text });

const starOf = (): Expr => ({ type: "star" });

const parseMember = (context: Context, at: At): Parsed<Spanned> => {
  if (context.isAt(at, "ident")) {
    return Result.map(tokenSpan(context, identifierOf))(context.bump(at));
  }
  if (context.isAt(at, "*")) {
    return Result.map(tokenSpan(context, starOf))(context.bump(at));
  }
  return failure("expected an identifier or `*`");
};

const parseInner = (context: Context, at: At): Parsed<Spanned> => {
  if (context.isAt(at, "*")) {
    return Result.map(tokenSpan(context, starOf))(context.bump(at));
  }
  return nested(at, (inner) => context.expr(inner, LOWEST));
};

const parseIndex = (context: Context, at: At, open: Token): Parsed<Spanned> =>
  pipe(
    parseInner(context, advanced(at)),
    Result.flatMap((inner) =>
      pipe(
        context.expect("]", "expected `]`")(inner.at),
        Result.map((close) =>
          stepOf(
            context.spanned(open.start, close.value.end, { type: "index", inner: inner.value }),
            close.at,
          ),
        ),
      ),
    ),
  );

const parsePart = (context: Context, at: At): Option.Option<Parsed<Spanned>> => {
  if (context.isAt(at, ".")) {
    return Option.some(parseMember(context, advanced(at)));
  }
  return pipe(
    context.peek(at),
    Option.filter((token) => token.tok === "["),
    Option.map((open) => parseIndex(context, at, open)),
  );
};

const parseParts =
  (context: Context) =>
  (at: At, parts: readonly Spanned[]): Parsed<readonly Spanned[]> =>
    Option.match(parsePart(context, at), {
      onNone: () => Result.succeed(stepOf(parts, at)),
      onSome: Result.flatMap((part) => parseParts(context)(part.at, Arr.append(parts, part.value))),
    });

const contextOf = (context: Context, head: Spanned, parts: readonly Spanned[]): Spanned => {
  if (parts.length === NEXT && head.expr.type !== "identifier") {
    return head;
  }
  const end = Option.getOrElse(
    Option.map(Arr.last(parts), (part) => part.origin.end),
    () => head.origin.end,
  );
  return context.spanned(head.origin.start, end, { type: "context", parts });
};

export const postfixOf =
  (context: Context) =>
  (head: Spanned, after: At): Parsed<Spanned> =>
    Result.map(parseParts(context)(after, [head]), (parts) =>
      stepOf(contextOf(context, head, parts.value), parts.at),
    );
