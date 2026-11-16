import { Array as Arr, Option, pipe } from "effect";
import type { AstNode } from "langium";

import {
  isAssign,
  isComputed,
  isEach,
  isExpression,
  isFor,
  isIf,
  isLet,
  isRepeat,
  isRest,
  isReturn,
  isSounding,
  isTypeRef,
  isVelocity,
  isWhile,
} from "#generated/langium/ast.ts";
import type { Fn } from "#generated/langium/ast.ts";

import { mismatchOf, returnTypeOf } from "./check-context.ts";
import type { Context, Expected } from "./check-context.ts";
import { problemAt } from "./problem.ts";
import type { From, Problem } from "./problem.ts";
import { fits, listOf, scalar, typeName, typeOfRef } from "./types.ts";

const NUMBER = scalar("number");
const BOOL = scalar("bool");
const PITCH = scalar("pitch");

export interface Site {
  readonly context: Context;
  readonly node: AstNode;
  readonly enclosing: Option.Option<Fn>;
}

const slotExpectedOf: From<Site, readonly Expected[]> = ({ context, node }) => {
  if ((isSounding(node) || isRest(node)) && isExpression(node.computedDuration)) {
    return [
      {
        node,
        property: "computedDuration",
        wanted: scalar("duration"),
        actual: context.typeOf(node.computedDuration),
      },
    ];
  }
  if (isVelocity(node) && isExpression(node.computed)) {
    return [{ node, property: "computed", wanted: NUMBER, actual: context.typeOf(node.computed) }];
  }
  return [];
};

const controlExpectedOf: From<Site, readonly Expected[]> = ({ context, node }) => {
  const { typeOf } = context;
  if (isIf(node) || isWhile(node)) {
    return [{ node, property: "condition", wanted: BOOL, actual: typeOf(node.condition) }];
  }
  if (isRepeat(node)) {
    return [{ node, property: "count", wanted: NUMBER, actual: typeOf(node.count) }];
  }
  if (isLet(node) && isTypeRef(node.type)) {
    return [{ node, property: "value", wanted: typeOfRef(node.type), actual: typeOf(node.value) }];
  }
  return [];
};

const assignExpectedOf: From<Site, readonly Expected[]> = ({ context, node }) => {
  const { typeOf, bindingType } = context;
  if (isAssign(node)) {
    return pipe(
      Option.fromNullishOr(node.target.ref),
      Option.map((target) => ({
        node,
        property: "value",
        wanted: bindingType(target),
        actual: typeOf(node.value),
      })),
      Option.toArray,
    );
  }
  return [];
};

const returnExpectedOf: From<Site, readonly Expected[]> = ({ context, node, enclosing }) => {
  const { typeOf } = context;
  if (isReturn(node)) {
    const actual = pipe(
      Option.fromNullishOr(node.value),
      Option.match({ onNone: () => scalar("none"), onSome: (value) => typeOf(value) }),
    );
    return pipe(
      enclosing,
      Option.map((fn) => ({ node, property: "value", wanted: returnTypeOf(fn), actual })),
      Option.toArray,
    );
  }
  return [];
};

const expectedOf: From<Site, readonly Expected[]> = (site) => [
  ...controlExpectedOf(site),
  ...assignExpectedOf(site),
  ...returnExpectedOf(site),
  ...slotExpectedOf(site),
];

const shapeProblemsOf: From<Site, readonly Problem[]> = ({ context, node }) => {
  if (isFor(node) || isEach(node)) {
    const items = context.typeOf(node.items);
    if (items.kind !== "list" && items.kind !== "unknown") {
      return [problemAt(node)("items")(`${typeName(items)} は順に回せません`)];
    }
  }
  if (isComputed(node)) {
    const value = context.typeOf(node.value);
    if (!fits(PITCH)(value) && !fits(listOf(PITCH))(value)) {
      return [
        problemAt(node)("value")(`音高か音高のリストが要るところに ${typeName(value)} があります`),
      ];
    }
  }
  return [];
};

export const statementProblemsOf: From<Site, readonly Problem[]> = (site) => [
  ...pipe(
    expectedOf(site),
    Arr.flatMap((expected) => Option.toArray(mismatchOf(expected))),
  ),
  ...shapeProblemsOf(site),
];
