import { Array as Arr, Match, Option, pipe } from "effect";
import { AstUtils } from "langium";
import type { AstNode } from "langium";

import { isBinding, isExpression, isFn, isParam } from "#generated/langium/ast.ts";
import type {
  Binary,
  Binding,
  Builtin,
  Call,
  Expression,
  Index,
  ListLiteral,
  Song as SongNode,
  Unary,
} from "#generated/langium/ast.ts";

import { mismatchOf, returnTypeOf } from "./check-context.ts";
import type { Context, Expected } from "./check-context.ts";
import { elementOf, ruleOf } from "./operators.ts";
import { problemAt } from "./problem.ts";
import type { From, Problem } from "./problem.ts";
import { statementProblemsOf } from "./statement-check.ts";
import { MEASURES, UNKNOWN, listOf, scalar, typeName, typeOfRef, typeOfValue } from "./types.ts";
import type { Type } from "./types.ts";
import { literalValue } from "./values.ts";

const NUMBER = scalar("number");
const BOOL = scalar("bool");
const ZERO = 0;
const ONE = 1;
const TWO = 2;

const expectIn: From<Context, From<Expected, void>> = (context) => (expected) => {
  Option.map(mismatchOf(expected), context.report);
};

const argsOf: From<Context, From<Builtin, readonly Type[]>> = (context) => (node) =>
  pipe(
    node.args,
    Arr.map((arg) => context.typeOf(arg)),
  );

const numbersIn: From<Context, From<Builtin, void>> = (context) => (node) => {
  for (const actual of argsOf(context)(node)) {
    expectIn(context)({ node, property: "args", wanted: NUMBER, actual });
  }
};

const pushType: From<Context, From<Builtin, Type>> = (context) => (node) => {
  const args = argsOf(context)(node);
  const list = Arr.get(args, ZERO);
  const item = Arr.get(args, ONE);
  if (Option.isNone(list) || Option.isNone(item) || list.value.kind !== "list") {
    return context.report(problemAt(node)("name")("push にはリストと足す値を渡します"));
  }
  expectIn(context)({ node, property: "args", wanted: list.value.element, actual: item.value });
  if (list.value.element.kind === "unknown") {
    return listOf(item.value);
  }
  return list.value;
};

const builtinType: From<Context, From<Builtin, Type>> = (context) => (node) =>
  Match.value(node.name).pipe(
    Match.when("range", () => {
      numbersIn(context)(node);
      if (node.args.length < ONE || node.args.length > TWO) {
        return context.report(problemAt(node)("name")("range には数を 1 つか 2 つ渡します"));
      }
      return listOf(NUMBER);
    }),
    Match.when("push", () => pushType(context)(node)),
    Match.when("len", () => NUMBER),
    Match.orElse(() => {
      numbersIn(context)(node);
      return NUMBER;
    }),
  );

const callType: From<Context, From<Call, Type>> = (context) => (node) =>
  pipe(
    Option.fromNullishOr(node.callee.ref),
    Option.match({
      onNone: () => UNKNOWN,
      onSome: (fn) => {
        if (fn.params.length !== node.args.length) {
          return context.report(
            problemAt(node)("args")(`${fn.name} は引数を ${String(fn.params.length)} 個とります`),
          );
        }
        for (const [param, arg] of Arr.zip(fn.params, node.args)) {
          expectIn(context)({
            node: arg,
            property: "$type",
            wanted: typeOfRef(param.type),
            actual: context.typeOf(arg),
          });
        }
        return returnTypeOf(fn);
      },
    }),
  );

const listType: From<Context, From<ListLiteral, Type>> = (context) => (node) => {
  const items = pipe(
    node.items,
    Arr.map((item) => context.typeOf(item)),
  );
  const first = pipe(
    Arr.head(items),
    Option.getOrElse(() => UNKNOWN),
  );
  for (const [item, actual] of Arr.zip(node.items, items)) {
    expectIn(context)({ node: item, property: "$type", wanted: first, actual });
  }
  return listOf(first);
};

const unaryType: From<Context, From<Unary, Type>> = (context) => (node) => {
  const operand = context.typeOf(node.operand);
  if (node.operator === "not") {
    expectIn(context)({ node, property: "operand", wanted: BOOL, actual: operand });
    return BOOL;
  }
  if (operand.kind !== "unknown" && !Arr.contains(["number", ...MEASURES], operand.kind)) {
    return context.report(problemAt(node)("operator")(`${typeName(operand)} に - は使えません`));
  }
  return operand;
};

const indexType: From<Context, From<Index, Type>> = (context) => (node) => {
  expectIn(context)({
    node,
    property: "index",
    wanted: NUMBER,
    actual: context.typeOf(node.index),
  });
  const list = context.typeOf(node.list);
  if (list.kind === "unknown") {
    return UNKNOWN;
  }
  return Option.match(elementOf(list), {
    onNone: () => context.report(problemAt(node)("list")(`${typeName(list)} は番号で引けません`)),
    onSome: (element) => element,
  });
};

const binaryType: From<Context, From<Binary, Type>> = (context) => (node) => {
  const left = context.typeOf(node.left);
  const right = context.typeOf(node.right);
  if (left.kind === "unknown" || right.kind === "unknown") {
    return UNKNOWN;
  }
  return Option.match(ruleOf({ operator: node.operator, left, right }), {
    onNone: () =>
      context.report(
        problemAt(node)("operator")(
          `${typeName(left)} と ${typeName(right)} に ${node.operator} は使えません`,
        ),
      ),
    onSome: (rule) => rule.result,
  });
};

const computeType: From<Context, From<Expression, Type>> = (context) => (node) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("$type")({
      Literal: (literal) =>
        Option.match(literalValue(literal), {
          onNone: () => context.report(problemAt(literal)("$type")("この値は読めません")),
          onSome: (value) => typeOfValue(value),
        }),
      ListLiteral: listType(context),
      Builtin: builtinType(context),
      Call: callType(context),
      Ref: (ref) =>
        pipe(
          Option.fromNullishOr(ref.target.ref),
          Option.match({
            onNone: () => UNKNOWN,
            onSome: (binding) => context.bindingType(binding),
          }),
        ),
      Group: (group) => context.typeOf(group.inner),
      Unary: unaryType(context),
      Index: indexType(context),
      Binary: binaryType(context),
    }),
  );

const declaredType: From<Context, From<Binding, Type>> = (context) => (binding) =>
  Match.value(binding).pipe(
    Match.discriminatorsExhaustive("$type")({
      Param: (param) => typeOfRef(param.type),
      Let: (node) =>
        pipe(
          Option.fromNullishOr(node.type),
          Option.match({
            onNone: () => context.typeOf(node.value),
            onSome: (type) => typeOfRef(type),
          }),
        ),
      For: (node) =>
        pipe(
          elementOf(context.typeOf(node.items)),
          Option.getOrElse(() => UNKNOWN),
        ),
      Each: (node) =>
        pipe(
          elementOf(context.typeOf(node.items)),
          Option.getOrElse(() => UNKNOWN),
        ),
    }),
  );

export const checkerFor: From<Problem[], Context> = (problems) => {
  const memo = new Map<AstNode, Type>();
  const visiting = new Set<AstNode>();
  const context: Context = {
    report: (problem) => {
      problems.push(problem);
      return UNKNOWN;
    },
    typeOf: (node) => memo.getOrInsertComputed(node, () => computeType(context)(node)),
    bindingType: (binding) => {
      if (visiting.has(binding)) {
        return UNKNOWN;
      }
      visiting.add(binding);
      const type = declaredType(context)(binding);
      visiting.delete(binding);
      return type;
    },
  };
  return context;
};

export const typeProblemsOf: From<SongNode, readonly Problem[]> = (song) => {
  const problems: Problem[] = [];
  const context = checkerFor(problems);
  for (const node of AstUtils.streamAst(song)) {
    if (isExpression(node)) {
      context.typeOf(node);
    }
    if (isBinding(node) && !isParam(node)) {
      context.bindingType(node);
    }
    const enclosing = Option.fromNullishOr(AstUtils.getContainerOfType(node, isFn));
    problems.push(
      ...statementProblemsOf({
        context,
        node,
        enclosing,
      }),
    );
  }
  return problems;
};
