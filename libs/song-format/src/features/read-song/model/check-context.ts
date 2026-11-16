import { Option, pipe } from "effect";
import type { AstNode } from "langium";

import type { Binding, Expression, Fn } from "#generated/langium/ast.ts";

import { problemAt } from "./problem.ts";
import type { From, Problem } from "./problem.ts";
import { fits, scalar, typeName, typeOfRef } from "./types.ts";
import type { Type } from "./types.ts";

export interface Expected {
  readonly node: AstNode;
  readonly property: string;
  readonly wanted: Type;
  readonly actual: Type;
}

export interface Context {
  readonly typeOf: From<Expression, Type>;
  readonly bindingType: From<Binding, Type>;
  readonly report: From<Problem, Type>;
}

export const mismatchOf: From<Expected, Option.Option<Problem>> = ({
  node,
  property,
  wanted,
  actual,
}) => {
  if (fits(wanted)(actual)) {
    return Option.none();
  }
  return Option.some(
    problemAt(node)(property)(`${typeName(wanted)} が要るところに ${typeName(actual)} があります`),
  );
};

export const returnTypeOf: From<Fn, Type> = (fn) =>
  pipe(
    Option.fromNullishOr(fn.returns),
    Option.match({ onNone: () => scalar("none"), onSome: (returns) => typeOfRef(returns) }),
  );
