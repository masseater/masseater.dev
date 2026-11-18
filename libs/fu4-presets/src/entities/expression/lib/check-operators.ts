import { assignable } from "#/entities/expression/model/assign.ts";
import type { CompareOp, Expr, LogicalOp } from "#/entities/expression/model/ast.ts";
import { merge } from "#/entities/expression/model/merge.ts";
import { BOOL, describe } from "#/entities/expression/model/types.ts";
import type { ExprType } from "#/entities/expression/model/types.ts";
import { quote } from "#/shared/text/index.ts";

import type { Scope } from "./scope.ts";

interface Binary<Op> {
  readonly op: Op;
  readonly left: Expr;
  readonly right: Expr;
}

const SCALAR = new Set(["number", "bool", "string"]);
const CONTAINER = new Set(["object", "array"]);
const ORDERED = new Set(["any", "number", "string"]);
const UNORDERED_RIGHT = new Set(["null", "bool", "object", "array"]);
const EQUALITY = new Set(["==", "!="]);

const equalable = (left: ExprType, right: ExprType): boolean => {
  if (left.kind === "any" || left.kind === "null") {
    return true;
  }
  if (SCALAR.has(left.kind)) {
    return !CONTAINER.has(right.kind);
  }
  if (left.kind === "object") {
    return right.kind === "object" || right.kind === "null" || right.kind === "any";
  }
  if (right.kind === "array" && left.kind === "array") {
    return equalable(left.elem, right.elem);
  }
  return right.kind === "null" || right.kind === "any";
};

const comparable = (op: CompareOp, left: ExprType, right: ExprType): boolean => {
  if (EQUALITY.has(op)) {
    return equalable(left, right);
  }
  return ORDERED.has(left.kind) && !UNORDERED_RIGHT.has(right.kind);
};

export const checkNot =
  (scope: Scope) =>
  (expr: Expr, operand: Expr): ExprType => {
    const type = scope.check(operand);
    if (!assignable(BOOL)(type)) {
      scope.fail(
        expr,
        `type of operand of ! operator ${quote(describe(type))} is not assignable to type "bool"`,
      );
    }
    return BOOL;
  };

export const checkCompare =
  (scope: Scope) =>
  (expr: Expr, compare: Binary<CompareOp>): ExprType => {
    const left = scope.check(compare.left);
    const right = scope.check(compare.right);
    if (!comparable(compare.op, left, right)) {
      scope.fail(
        expr,
        `${quote(describe(left))} value cannot be compared to ${quote(describe(right))} value with ${quote(compare.op)} operator`,
      );
    }
    return BOOL;
  };

const narrowed =
  (scope: Scope) =>
  (expr: Expr, truthy: boolean): ExprType => {
    if (expr.type === "not") {
      return narrowed(scope)(expr.operand, !truthy);
    }
    if (expr.type !== "logical") {
      return scope.check(expr);
    }
    if ((expr.op === "&&") === truthy) {
      scope.check(expr.left);
      return scope.check(expr.right);
    }
    return merge(narrowed(scope)(expr.left, expr.op === "||"))(scope.check(expr.right));
  };

export const checkLogical =
  (scope: Scope) =>
  (logical: Binary<LogicalOp>): ExprType => {
    const left = narrowed(scope)(logical.left, logical.op === "||");
    return merge(left)(scope.check(logical.right));
  };
