import { Array as Arr, Option, Record as Rec } from "effect";

import type { Expr } from "#/entities/expression/model/ast.ts";
import { ANY, describe, filteredOf } from "#/entities/expression/model/types.ts";
import type { ExprType, ObjectType } from "#/entities/expression/model/types.ts";
import { quote } from "#/shared/text/index.ts";

import type { Scope } from "./scope.ts";

const DEREF_ANY = filteredOf(ANY);

const fromMapped =
  (scope: Scope, expr: Expr) =>
  (object: ObjectType, mapped: ExprType): ExprType => {
    if (mapped.kind === "any") {
      return DEREF_ANY;
    }
    if (mapped.kind === "object") {
      return filteredOf(mapped);
    }
    scope.fail(
      expr,
      `elements of object at receiver of object filtering \`.*\` must be type of object but got ${quote(describe(mapped))}. the type of receiver was ${quote(describe(object))}`,
    );
    return ANY;
  };

const fromObject = (scope: Scope, expr: Expr, object: ObjectType): ExprType => {
  if (Option.isSome(object.mapped)) {
    return fromMapped(scope, expr)(object, object.mapped.value);
  }
  if (Arr.some(Rec.values(object.props), (type) => type.kind === "object")) {
    return DEREF_ANY;
  }
  scope.fail(
    expr,
    `object type ${quote(describe(object))} cannot be filtered by object filtering \`.*\` since it has no object element`,
  );
  return ANY;
};

export const checkArrayDeref =
  (scope: Scope) =>
  (expr: Expr, receiver: Expr): ExprType => {
    const type = scope.check(receiver);
    if (type.kind === "any") {
      return DEREF_ANY;
    }
    if (type.kind === "array") {
      return filteredOf(type.elem);
    }
    if (type.kind === "object") {
      return fromObject(scope, expr, type);
    }
    scope.fail(
      expr,
      `receiver of object filtering \`.*\` must be type of array or object but got ${quote(describe(type))}`,
    );
    return ANY;
  };
