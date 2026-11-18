import { Array as Arr, Equal, Match, Option, String as Str, pipe } from "effect";

import type {
  ContextExpr,
  Evaluation,
  Expr,
  Spanned,
} from "#/entities/expression-tree/model/types.ts";

import { consteval } from "./consteval.ts";

export interface ContextAt {
  readonly context: ContextExpr;
  readonly spanned: Spanned;
}

type CallExpr = Extract<Expr, { readonly type: "call" }>;
type Equals = (left: Expr, right: Expr) => boolean;

const COMMUTATIVE = new Set(["and", "or", "eq", "neq"]);
const DATAFLOW_CALLS = new Set(["tojson", "fromjson", "format", "join"]);
const PAIR = 2;
const VALUE = 1;

const noContexts = (): readonly ContextAt[] => [];
const noSpanned = (): readonly Spanned[] => [];

export const contexts = (spanned: Spanned): readonly ContextAt[] =>
  Match.value(spanned.expr).pipe(
    Match.discriminatorsExhaustive("type")({
      literal: noContexts,
      star: noContexts,
      identifier: noContexts,
      index: (expr) => contexts(expr.inner),
      not: (expr) => contexts(expr.inner),
      call: (expr) => pipe(expr.args, Arr.flatMap(contexts)),
      context: (expr) => [{ context: expr, spanned }, ...pipe(expr.parts, Arr.flatMap(contexts))],
      binary: (expr) => [...contexts(expr.lhs), ...contexts(expr.rhs)],
    }),
  );

const valueOf = (chunk: readonly Spanned[]): readonly Spanned[] =>
  Option.toArray(Arr.get(chunk, VALUE));

const caseValues = (args: readonly Spanned[]): readonly Spanned[] => [
  ...pipe(args, Arr.chunksOf(PAIR), Arr.flatMap(valueOf)),
  ...Option.toArray(Arr.last(args)),
];

const callDataflow =
  (recurse: (spanned: Spanned) => readonly ContextAt[]) =>
  (expr: CallExpr): readonly ContextAt[] => {
    if (DATAFLOW_CALLS.has(expr.func)) {
      return pipe(expr.args, Arr.flatMap(recurse));
    }
    if (expr.func === "case") {
      return pipe(caseValues(expr.args), Arr.flatMap(recurse));
    }
    return [];
  };

export const dataflowContexts = (spanned: Spanned): readonly ContextAt[] => {
  const { expr } = spanned;
  if (expr.type === "call") {
    return callDataflow(dataflowContexts)(expr);
  }
  if (expr.type === "context") {
    return [{ context: expr, spanned }];
  }
  if (expr.type === "binary" && expr.op === "and") {
    return dataflowContexts(expr.rhs);
  }
  if (expr.type === "binary" && expr.op === "or") {
    return [...dataflowContexts(expr.lhs), ...dataflowContexts(expr.rhs)];
  }
  return [];
};

export const leafExpressions = (spanned: Spanned): readonly Spanned[] => {
  const { expr } = spanned;
  if (expr.type === "binary" && expr.op === "and") {
    return leafExpressions(expr.rhs);
  }
  if (expr.type === "binary" && expr.op === "or") {
    return [...leafExpressions(expr.lhs), ...leafExpressions(expr.rhs)];
  }
  return [spanned];
};

const isComputed = (inner: Spanned): boolean =>
  inner.expr.type !== "literal" && inner.expr.type !== "star";

export const computedIndices = (spanned: Spanned): readonly Spanned[] =>
  Match.value(spanned.expr).pipe(
    Match.discriminatorsExhaustive("type")({
      literal: noSpanned,
      star: noSpanned,
      identifier: noSpanned,
      call: (expr) => pipe(expr.args, Arr.flatMap(computedIndices)),
      index: (expr) => Option.toArray(Option.liftPredicate(spanned, () => isComputed(expr.inner))),
      context: (expr) => pipe(expr.parts, Arr.flatMap(computedIndices)),
      binary: (expr) => [...computedIndices(expr.lhs), ...computedIndices(expr.rhs)],
      not: (expr) => computedIndices(expr.inner),
    }),
  );

const childrenOf: (expr: Expr) => readonly Spanned[] = Match.type<Expr>().pipe(
  Match.discriminatorsExhaustive("type")({
    literal: noSpanned,
    star: noSpanned,
    identifier: noSpanned,
    call: (expr) => expr.args,
    context: (expr) => expr.parts,
    binary: (expr) => [expr.lhs, expr.rhs],
    not: (expr) => [expr.inner],
    index: (expr) => [expr.inner],
  }),
);

export const constevalSubexprs = (
  spanned: Spanned,
): readonly (readonly [Spanned, Evaluation])[] => {
  const own = pipe(
    Option.liftPredicate(spanned.expr, (expr) => expr.type !== "literal"),
    Option.flatMap(consteval),
  );
  if (Option.isSome(own)) {
    return [[spanned, own.value]];
  }
  return pipe(childrenOf(spanned.expr), Arr.flatMap(constevalSubexprs));
};

const literalEquals = (left: Expr, right: Expr): boolean =>
  left.type === "literal" && right.type === "literal" && Equal.equals(left.literal, right.literal);

const listEquals =
  (equals: Equals) =>
  (left: readonly Spanned[], right: readonly Spanned[]): boolean =>
    left.length === right.length &&
    pipe(
      Arr.zip(left, right),
      Arr.every(([one, other]) => equals(one.expr, other.expr)),
    );

const sameNode =
  (equals: Equals) =>
  (left: Expr, right: Expr): boolean => {
    const lists = listEquals(equals);
    if (left.type === "identifier" && right.type === "identifier") {
      return Str.toLowerCase(left.name) === Str.toLowerCase(right.name);
    }
    if (left.type === "call" && right.type === "call") {
      return left.func === right.func && lists(left.args, right.args);
    }
    if (left.type === "binary" && right.type === "binary") {
      return left.op === right.op && lists([left.lhs, left.rhs], [right.lhs, right.rhs]);
    }
    return lists(childrenOf(left), childrenOf(right));
  };

const exprEquals: Equals = (left, right) => {
  if (left.type === "literal") {
    return literalEquals(left, right);
  }
  return left.type === right.type && sameNode(exprEquals)(left, right);
};

export const commutativeMatches =
  (left: Expr) =>
  (right: Expr): boolean => {
    if (left.type !== "binary" || right.type !== "binary") {
      return exprEquals(left, right);
    }
    if (left.op !== right.op) {
      return false;
    }
    const positional =
      commutativeMatches(left.lhs.expr)(right.lhs.expr) &&
      commutativeMatches(left.rhs.expr)(right.rhs.expr);
    return (
      positional ||
      (COMMUTATIVE.has(left.op) &&
        commutativeMatches(left.lhs.expr)(right.rhs.expr) &&
        commutativeMatches(left.rhs.expr)(right.lhs.expr))
    );
  };
