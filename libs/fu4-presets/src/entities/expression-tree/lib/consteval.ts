import { Array as Arr, Match, Option, pipe } from "effect";

import type {
  BinaryOp,
  Evaluation,
  Expr,
  Literal,
} from "#/entities/expression-tree/model/types.ts";

import { evaluateCall } from "./call.ts";
import { asBoolean, booleanOf, semaCompare, semaEquals } from "./evaluation.ts";

const literalValue = (literal: Literal): Evaluation => {
  if (literal.kind === "null") {
    return { type: "null" };
  }
  if (literal.kind === "string") {
    return { type: "string", value: literal.value };
  }
  if (literal.kind === "number") {
    return { type: "number", value: literal.value };
  }
  return booleanOf(literal.value);
};

const EQUAL = 0;

const ordered =
  (test: (order: number) => boolean) =>
  (left: Evaluation, right: Evaluation): Evaluation =>
    booleanOf(Option.exists(semaCompare(left)(right), test));

const OPERATORS: Readonly<Record<BinaryOp, (left: Evaluation, right: Evaluation) => Evaluation>> = {
  and: (left, right) => {
    if (asBoolean(left)) {
      return right;
    }
    return left;
  },
  or: (left, right) => {
    if (asBoolean(left)) {
      return left;
    }
    return right;
  },
  eq: (left, right) => booleanOf(semaEquals(left)(right)),
  neq: (left, right) => booleanOf(!semaEquals(left)(right)),
  lt: ordered((order) => order < EQUAL),
  le: ordered((order) => order <= EQUAL),
  gt: ordered((order) => order > EQUAL),
  ge: ordered((order) => order >= EQUAL),
};

const none = (): Option.Option<Evaluation> => Option.none();

export const consteval = (expr: Expr): Option.Option<Evaluation> =>
  Match.value(expr).pipe(
    Match.discriminatorsExhaustive("type")({
      literal: ({ literal }) => Option.some(literalValue(literal)),
      binary: ({ lhs, op, rhs }) =>
        pipe(
          Option.all([consteval(lhs.expr), consteval(rhs.expr)]),
          Option.map(([left, right]) => OPERATORS[op](left, right)),
        ),
      not: ({ inner }) =>
        Option.map(consteval(inner.expr), (value) => booleanOf(!asBoolean(value))),
      call: ({ args, func }) =>
        pipe(
          args,
          Arr.map((arg) => consteval(arg.expr)),
          Option.all,
          Option.flatMap(evaluateCall(func)),
        ),
      star: none,
      identifier: none,
      index: none,
      context: none,
    }),
  );
