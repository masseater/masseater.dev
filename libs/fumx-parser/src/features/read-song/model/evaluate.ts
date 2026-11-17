import { Array as Arr, Match, Option, pipe } from "effect";
import type { AstNode } from "langium";

import type {
  Bar,
  Binary,
  Binding,
  Call,
  Expression,
  Fn,
  Index,
  Song as SongNode,
  Statement,
  Unary,
} from "#generated/langium/ast.ts";

import { expandBar } from "./expand.ts";
import type { Env } from "./expand.ts";
import { ruleOf } from "./operators.ts";
import type { Compiled, From } from "./problem.ts";
import {
  DEPTH_LIMIT,
  builtinIn,
  failIn,
  frameHolding,
  freshState,
  isTopLevel,
  numberOf,
  tickIn,
} from "./runtime.ts";
import type { Scope } from "./runtime.ts";
import { NEXT, runStatement } from "./statements.ts";
import type { Machine, Signal } from "./statements.ts";
import { typeOfValue } from "./types.ts";
import { NOTHING, boolValue, literalValue } from "./values.ts";
import type { Value } from "./values.ts";

const ONE = 1;

const lookupIn: From<Machine, From<Binding, Value>> = (machine) => (binding) => {
  const { state, frames } = machine.scope;
  return pipe(
    frameHolding(frames)(binding),
    Option.flatMap((frame) => Option.fromNullishOr(frame.get(binding))),
    Option.orElse(() => Option.fromNullishOr(state.globals.get(binding))),
    Option.getOrElse(() => {
      if (!isTopLevel(binding)) {
        return failIn(state)({ node: binding, message: `${binding.name} はまだ値がありません` });
      }
      const value = machine.at([]).value(binding.value);
      state.globals.set(binding, value);
      return value;
    }),
  );
};

const callIn: From<Machine, From<readonly [Fn, readonly Value[], AstNode], Value>> =
  (machine) =>
  ([fn, args, node]) => {
    const { state } = machine.scope;
    if (state.depth >= DEPTH_LIMIT) {
      return failIn(state)({
        node,
        message: `呼び出しの深さが上限（${String(DEPTH_LIMIT)}）を超えました`,
      });
    }
    state.depth += ONE;
    const frame = new Map<AstNode, Value>(Arr.zip(fn.params, args));
    const signal = machine.at([frame]).run(fn.body);
    state.depth -= ONE;
    if (signal.kind === "return") {
      return signal.value;
    }
    return NOTHING;
  };

const argsIn: From<Machine, From<readonly Expression[], readonly Value[]>> = (machine) => (nodes) =>
  pipe(
    nodes,
    Arr.map((node) => machine.value(node)),
  );

const indexIn: From<Machine, From<Index, Value>> = (machine) => (node) => {
  const list = machine.value(node.list);
  const index = numberOf(machine.value(node.index));
  const found = pipe(
    Option.liftPredicate(index, (position) => Number.isInteger(position)),
    Option.flatMap((position) => {
      if (list.kind !== "list") {
        return Option.none();
      }
      return Arr.get(list.items, position);
    }),
  );
  return Option.getOrElse(found, () =>
    failIn(machine.scope.state)({ node, message: "リストの範囲の外を引きました" }),
  );
};

const unaryIn: From<Machine, From<Unary, Value>> = (machine) => (node) => {
  const operand = machine.value(node.operand);
  if (operand.kind === "bool") {
    return boolValue(!operand.value);
  }
  if ("value" in operand && typeof operand.value === "number") {
    return { ...operand, value: -operand.value };
  }
  return failIn(machine.scope.state)({ node, message: "- は数にだけ使えます" });
};

const binaryIn: From<Machine, From<Binary, Value>> = (machine) => (node) => {
  const left = machine.value(node.left);
  const shortCut =
    left.kind === "bool" &&
    ((node.operator === "and" && !left.value) || (node.operator === "or" && left.value));
  if (shortCut) {
    return left;
  }
  const right = machine.value(node.right);
  const fail: From<string, Value> = (message) => failIn(machine.scope.state)({ node, message });
  const rule = ruleOf({
    operator: node.operator,
    left: typeOfValue(left),
    right: typeOfValue(right),
  });
  return Option.match(rule, {
    onNone: () => fail(`${left.kind} と ${right.kind} に ${node.operator} は使えません`),
    onSome: ({ apply }) => {
      const outcome = apply({ left, right });
      if (outcome.ok) {
        return outcome.value;
      }
      return fail(outcome.message);
    },
  });
};

const refIn: From<Machine, From<Option.Option<Binding>, Value>> = (machine) => (target) =>
  Option.match(target, { onNone: () => NOTHING, onSome: (binding) => lookupIn(machine)(binding) });

const callValueIn: From<Machine, From<Call, Value>> = (machine) => (call) => {
  const args = argsIn(machine)(call.args);
  return Option.match(Option.fromNullishOr(call.callee.ref), {
    onNone: () => NOTHING,
    onSome: (fn) => machine.call([fn, args, call]),
  });
};

const computeIn: From<Machine, From<Expression, Value>> = (machine) => (node) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("$type")({
      Literal: (literal) =>
        Option.getOrElse(literalValue(literal), () =>
          failIn(machine.scope.state)({ node: literal, message: "この値は読めません" }),
        ),
      ListLiteral: (list): Value => ({ kind: "list", items: argsIn(machine)(list.items) }),
      Group: (group) => machine.value(group.inner),
      Ref: (ref) => refIn(machine)(Option.fromNullishOr(ref.target.ref)),
      Call: callValueIn(machine),
      Builtin: (builtin) =>
        builtinIn(machine.scope.state)([builtin, argsIn(machine)(builtin.args)]),
      Index: indexIn(machine),
      Unary: unaryIn(machine),
      Binary: binaryIn(machine),
    }),
  );

const valueIn: From<Machine, From<Expression, Value>> = (machine) => (node) => {
  if (!tickIn(machine.scope.state)(node)) {
    return NOTHING;
  }
  return computeIn(machine)(node);
};

const envOf: From<Machine, Env> = (machine) => ({
  value: machine.value,
  with: ([binding, value]) => envOf(machine.inner(new Map<AstNode, Value>([[binding, value]]))),
  fail: ({ node, message }) => {
    failIn(machine.scope.state)({ node, message });
  },
});

const runIn: From<Machine, From<readonly Statement[], Signal>> = (machine) => (statements) => {
  for (const node of statements) {
    if (!tickIn(machine.scope.state)(node)) {
      return NEXT;
    }
    const signal = runStatement(machine)(node);
    if (signal.kind === "return") {
      return signal;
    }
  }
  return NEXT;
};

const machineOf: From<Scope, Machine> = (scope) => {
  const machine: Machine = {
    scope,
    value: (node) => valueIn(machine)(node),
    call: (call) => callIn(machine)(call),
    expand: (bar) => expandBar(envOf(machine))(bar),
    inner: (frame) => machineOf({ state: scope.state, frames: [...scope.frames, frame] }),
    at: (frames) => machineOf({ state: scope.state, frames }),
    run: (statements) => runIn(machine)(statements),
  };
  return machine;
};

export const runSong: From<SongNode, Compiled<readonly Bar[]>> = (song) => {
  const state = freshState();
  machineOf({ state, frames: [] }).run(song.body);
  return { value: state.bars, problems: state.problems };
};
