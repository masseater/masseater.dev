import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { ContextExpr, Expr } from "#/entities/expression-tree/model/types.ts";

const PATTERN = /^[A-Za-z0-9_-]+(?:\.(?:[A-Za-z0-9_-]+|\*))*$/u;
const PAIR = 2;
const HEAD = 0;
const TAIL = 1;

type Comparison = "child" | "match";

const comparePart = (pattern: string, part: Expr): boolean => {
  if (pattern === "*") {
    return true;
  }
  if (part.type === "identifier") {
    return Str.toLowerCase(pattern) === Str.toLowerCase(part.name);
  }
  if (
    part.type === "index" &&
    part.inner.expr.type === "literal" &&
    part.inner.expr.literal.kind === "string"
  ) {
    return Str.toLowerCase(pattern) === Str.toLowerCase(part.inner.expr.literal.value);
  }
  return false;
};

const compare = (pattern: string, context: ContextExpr): Option.Option<Comparison> => {
  if (!PATTERN.test(pattern)) {
    return Option.none();
  }
  const patterns = Str.split(".")(pattern);
  const shared = Math.min(patterns.length, context.parts.length);
  const prefix = Arr.zip(Arr.take(patterns, shared), Arr.take(context.parts, shared));
  if (
    !pipe(
      prefix,
      Arr.every(([each, part]) => comparePart(each, part.expr)),
    )
  ) {
    return Option.none();
  }
  if (patterns.length === context.parts.length) {
    return Option.some("match");
  }
  return Option.liftPredicate<Comparison>("child", () => patterns.length < context.parts.length);
};

export const matchesPattern =
  (pattern: string) =>
  (context: ContextExpr): boolean =>
    Option.contains(compare(pattern, context), "match");

export const childOf =
  (pattern: string) =>
  (context: ContextExpr): boolean =>
    Option.isSome(compare(pattern, context));

const stringIndex = (part: Expr): Option.Option<string> => {
  if (
    part.type === "index" &&
    part.inner.expr.type === "literal" &&
    part.inner.expr.literal.kind === "string"
  ) {
    return Option.some(part.inner.expr.literal.value);
  }
  return Option.none();
};

const tailName = (last: Expr): Option.Option<string> => {
  if (last.type === "identifier") {
    return Option.some(last.name);
  }
  return stringIndex(last);
};

export const singleTail = (context: ContextExpr): Option.Option<string> => {
  if (context.parts.length !== PAIR) {
    return Option.none();
  }
  return pipe(
    Arr.get(context.parts, HEAD),
    Option.filter((head) => head.expr.type === "identifier"),
    Option.flatMap(() => Arr.get(context.parts, TAIL)),
    Option.flatMap((tail) => tailName(tail.expr)),
  );
};

const partPattern = (part: Expr): Option.Option<string> => {
  if (part.type === "identifier") {
    return Option.some(part.name);
  }
  if (part.type === "star") {
    return Option.some("*");
  }
  if (part.type === "index") {
    if (part.inner.expr.type === "literal" && part.inner.expr.literal.kind === "string") {
      return Option.some(part.inner.expr.literal.value);
    }
    return Option.some("*");
  }
  return Option.none();
};

const ASCII_UPPER = /^[A-Z]$/u;

const asciiLower = (char: string): string => {
  if (ASCII_UPPER.test(char)) {
    return Str.toLowerCase(char);
  }
  return char;
};

const lowerAscii = (text: string): string =>
  pipe(Str.split("")(text), Arr.map(asciiLower), Arr.join(""));

export const asPattern = (context: ContextExpr): Option.Option<string> =>
  pipe(
    Arr.head(context.parts),
    Option.filter((head) => head.expr.type !== "call"),
    Option.flatMap(() =>
      Option.all(
        pipe(
          context.parts,
          Arr.map((part) => partPattern(part.expr)),
        ),
      ),
    ),
    Option.map((parts) => lowerAscii(Arr.join(parts, "."))),
  );
