import { Option, Record as Rec } from "effect";

import type { Expr } from "#/entities/expression/model/ast.ts";
import { ANY, describe, filteredOf, propertyOf } from "#/entities/expression/model/types.ts";
import type { ArrayType, ExprType, ObjectType } from "#/entities/expression/model/types.ts";
import { quote } from "#/shared/text/index.ts";

import { checkConfigVariable } from "./check-config-variable.ts";
import type { Scope } from "./scope.ts";

export interface Deref {
  readonly expr: Expr;
  readonly receiver: Expr;
  readonly property: string;
}

const notObject = (scope: Scope, deref: Deref, type: ExprType): ExprType => {
  scope.fail(
    deref.expr,
    `receiver of object dereference ${quote(deref.property)} must be type of object but got ${quote(describe(type))}`,
  );
  return ANY;
};

const fromObject = (scope: Scope, deref: Deref, object: ObjectType): ExprType => {
  const found = Rec.get(object.props, deref.property);
  if (Option.isSome(found)) {
    return found.value;
  }
  if (Option.isSome(object.mapped)) {
    if (deref.receiver.type === "variable" && deref.receiver.name === "vars") {
      checkConfigVariable(scope)(deref.expr, deref.property);
    }
    return object.mapped.value;
  }
  scope.fail(
    deref.expr,
    `property ${quote(deref.property)} is not defined in object type ${describe(object)}`,
  );
  return ANY;
};

const elementOf = (scope: Scope, deref: Deref, element: ObjectType): ExprType =>
  Option.getOrElse(propertyOf(deref.property)(element), () => {
    scope.fail(
      deref.expr,
      `property ${quote(deref.property)} is not defined in object type ${describe(element)} as element of filtered array`,
    );
    return ANY;
  });

const fromArray = (scope: Scope, deref: Deref, array: ArrayType): ExprType => {
  if (!array.deref) {
    return notObject(scope, deref, array);
  }
  if (array.elem.kind === "any") {
    return array;
  }
  if (array.elem.kind === "object") {
    return filteredOf(elementOf(scope, deref, array.elem));
  }
  scope.fail(
    deref.expr,
    `property filtered by ${quote(deref.property)} at object filtering must be type of object but got ${quote(describe(array.elem))}`,
  );
  return ANY;
};

export const checkObjectDeref =
  (scope: Scope) =>
  (deref: Deref): ExprType => {
    const type = scope.check(deref.receiver);
    if (type.kind === "any") {
      return ANY;
    }
    if (type.kind === "object") {
      return fromObject(scope, deref, type);
    }
    if (type.kind === "array") {
      return fromArray(scope, deref, type);
    }
    return notObject(scope, deref, type);
  };
