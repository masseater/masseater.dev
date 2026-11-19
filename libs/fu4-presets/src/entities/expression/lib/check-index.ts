import { Option, pipe } from "effect";

import type { Expr } from "#/entities/expression/model/ast.ts";
import { ANY, describe, propertyOf } from "#/entities/expression/model/types.ts";
import type { ExprType, ObjectType } from "#/entities/expression/model/types.ts";
import { quote } from "#/shared/text/index.ts";

import type { Scope } from "./scope.ts";

interface Access {
  readonly expr: Expr;
  readonly index: Expr;
  readonly key: ExprType;
}

const wrongKey = (scope: Scope, access: Access, what: string): ExprType => {
  scope.fail(access.index, `${what} but got ${quote(describe(access.key))}`);
  return ANY;
};

const literalProperty = (scope: Scope, access: Access, object: ObjectType): ExprType => {
  if (access.index.type !== "string") {
    return Option.getOrElse(object.mapped, () => ANY);
  }
  const name = access.index.value;
  return pipe(
    propertyOf(name)(object),
    Option.getOrElse(() => {
      scope.fail(
        access.expr,
        `property ${quote(name)} is not defined in object type ${describe(object)}`,
      );
      return ANY;
    }),
  );
};

const fromObject = (scope: Scope, access: Access, object: ObjectType): ExprType => {
  if (access.key.kind === "any") {
    return ANY;
  }
  if (access.key.kind === "string") {
    return literalProperty(scope, access, object);
  }
  return wrongKey(scope, access, "property access of object must be type of string");
};

const fromOperand = (scope: Scope, access: Access, operand: ExprType): ExprType => {
  if (operand.kind === "any") {
    return ANY;
  }
  if (operand.kind === "array") {
    if (access.key.kind === "any" || access.key.kind === "number") {
      return operand.elem;
    }
    return wrongKey(scope, access, "index access of array must be type of number");
  }
  if (operand.kind === "object") {
    return fromObject(scope, access, operand);
  }
  scope.fail(
    access.expr,
    `index access operand must be type of object or array but got ${quote(describe(operand))}`,
  );
  return ANY;
};

export const checkIndex =
  (scope: Scope) =>
  (expr: Expr, operand: Expr, index: Expr): ExprType => {
    const key = scope.check(index);
    return fromOperand(scope, { expr, index, key }, scope.check(operand));
  };
