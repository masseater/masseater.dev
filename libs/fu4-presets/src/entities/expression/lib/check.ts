import { Array as Arr, Option, Record as Rec, String as Str } from "effect";

import type { Expr } from "#/entities/expression/model/ast.ts";
import { ANY, BOOL, NULL, NUMBER, STRING } from "#/entities/expression/model/types.ts";
import type { ExprType } from "#/entities/expression/model/types.ts";
import { quote, quotes, sortedQuotes } from "#/shared/text/index.ts";

import { checkArrayDeref } from "./check-array-deref.ts";
import { checkCall } from "./check-call.ts";
import { checkIndex } from "./check-index.ts";
import { checkObjectDeref } from "./check-object-deref.ts";
import { checkCompare, checkLogical, checkNot } from "./check-operators.ts";
import { AVAILABILITY_DOCS } from "./scope.ts";
import type { Scope } from "./scope.ts";

const LITERALS: Readonly<Record<string, ExprType>> = {
  null: NULL,
  bool: BOOL,
  string: STRING,
  int: NUMBER,
  float: NUMBER,
};
const NONE = 0;
const ONE = 1;

const contextNote = (contexts: readonly string[]): string => {
  if (contexts.length === NONE) {
    return "no context is available here";
  }
  if (contexts.length === ONE) {
    return `available context is ${quotes(contexts)}`;
  }
  return `available contexts are ${quotes(contexts)}`;
};

const checkContext = (scope: Scope, expr: Expr, name: string): void => {
  const { contexts } = scope.env;
  if (!Arr.contains(contexts, Str.toLowerCase(name))) {
    scope.fail(
      expr,
      `context ${quote(name)} is not allowed here. ${contextNote(contexts)}. ${AVAILABILITY_DOCS}`,
    );
  }
};

const checkVariable = (scope: Scope, expr: Expr & { readonly type: "variable" }): ExprType =>
  Option.match(Rec.get(scope.env.vars, expr.name), {
    onNone: () => {
      scope.fail(
        expr,
        `undefined variable ${quote(expr.token.value)}. available variables are ${sortedQuotes(Rec.keys(scope.env.vars))}`,
      );
      return ANY;
    },
    onSome: (type) => {
      checkContext(scope, expr, expr.name);
      return type;
    },
  });

const checkOperation = (scope: Scope, expr: Expr): ExprType => {
  if (expr.type === "call") {
    return checkCall(scope)({ expr, callee: expr.callee, args: expr.args });
  }
  if (expr.type === "not") {
    return checkNot(scope)(expr, expr.operand);
  }
  if (expr.type === "compare") {
    return checkCompare(scope)(expr, expr);
  }
  if (expr.type === "logical") {
    return checkLogical(scope)(expr);
  }
  return ANY;
};

const checkAccess = (scope: Scope, expr: Expr): ExprType => {
  if (expr.type === "object-deref") {
    return checkObjectDeref(scope)({ expr, receiver: expr.receiver, property: expr.property });
  }
  if (expr.type === "array-deref") {
    return checkArrayDeref(scope)(expr, expr.receiver);
  }
  if (expr.type === "index") {
    return checkIndex(scope)(expr, expr.operand, expr.index);
  }
  return checkOperation(scope, expr);
};

export const checkExpr =
  (scope: Scope) =>
  (expr: Expr): ExprType => {
    if (expr.type === "variable") {
      return checkVariable(scope, expr);
    }
    return Option.getOrElse(Rec.get(LITERALS, expr.type), () => checkAccess(scope, expr));
  };
