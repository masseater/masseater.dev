import { Array as Arr, Match, Option, pipe } from "effect";
import type { AstNode } from "langium";

import type {
  Assign,
  Bar,
  Binding,
  CallStatement,
  Expression,
  Fn,
  For,
  If,
  Repeat,
  Statement,
  While,
} from "#generated/langium/ast.ts";

import type { From } from "./problem.ts";
import { countUp, failIn, frameHolding, isTopLevel, numberOf } from "./runtime.ts";
import type { Frames, Scope } from "./runtime.ts";
import { NOTHING } from "./values.ts";
import type { Value } from "./values.ts";

const ZERO = 0;

export type Signal = { readonly kind: "next" } | { readonly kind: "return"; readonly value: Value };

export interface Machine {
  readonly scope: Scope;
  readonly value: From<Expression, Value>;
  readonly call: From<readonly [Fn, readonly Value[], AstNode], Value>;
  readonly expand: From<Bar, Bar>;
  readonly inner: From<Map<AstNode, Value>, Machine>;
  readonly at: From<Frames, Machine>;
  readonly run: From<readonly Statement[], Signal>;
}

export const NEXT: Signal = { kind: "next" };

type Frame = Map<AstNode, Value>;

const passIn: From<Machine, From<readonly [readonly Statement[], Frame], Option.Option<Signal>>> =
  (machine) =>
  ([body, frame]) => {
    const signal = machine.inner(frame).run(body);
    if (signal.kind === "return" || machine.scope.state.halted) {
      return Option.some(signal);
    }
    return Option.none();
  };

const loopIn: From<Machine, From<readonly [readonly Statement[], readonly Frame[]], Signal>> =
  (machine) =>
  ([body, frames]) => {
    for (const frame of frames) {
      const stopped = passIn(machine)([body, frame]);
      if (Option.isSome(stopped)) {
        return stopped.value;
      }
    }
    return NEXT;
  };

const holdsIn: From<Machine, From<Expression, boolean>> = (machine) => (condition) => {
  const holds = machine.value(condition);
  return !machine.scope.state.halted && holds.kind === "bool" && holds.value;
};

const whileIn: From<Machine, From<While, Signal>> = (machine) => (loop) => {
  while (holdsIn(machine)(loop.condition)) {
    const stopped = passIn(machine)([loop.body, new Map()]);
    if (Option.isSome(stopped)) {
      return stopped.value;
    }
  }
  return NEXT;
};

const ifIn: From<Machine, From<If, Signal>> = (machine) => (node) => {
  if (holdsIn(machine)(node.condition)) {
    return machine.inner(new Map()).run(node.then);
  }
  return Option.match(Option.fromNullishOr(node.otherwise), {
    onNone: () => machine.inner(new Map()).run(node.else),
    onSome: (otherwise) => ifIn(machine)(otherwise),
  });
};

const assignIn: From<Machine, From<readonly [Binding, Value], void>> =
  (machine) =>
  ([binding, value]) => {
    const { state, frames } = machine.scope;
    Option.match(frameHolding(frames)(binding), {
      onNone: () => {
        if (state.globals.has(binding) || isTopLevel(binding)) {
          state.globals.set(binding, value);
          return;
        }
        failIn(state)({ node: binding, message: "この名前には代入できません" });
      },
      onSome: (frame) => {
        frame.set(binding, value);
      },
    });
  };

const countedIn: From<Machine, From<Expression, Option.Option<number>>> = (machine) => (node) => {
  const count = numberOf(machine.value(node));
  if (Number.isInteger(count) && count >= ZERO) {
    return Option.some(count);
  }
  failIn(machine.scope.state)({ node, message: "repeat には 0 以上の整数を渡します" });
  return Option.none();
};

const forIn: From<Machine, From<For, Signal>> = (machine) => (loop) => {
  const items = machine.value(loop.items);
  if (items.kind !== "list") {
    failIn(machine.scope.state)({ node: loop, message: "for にはリストを渡します" });
    return NEXT;
  }
  return loopIn(machine)([
    loop.body,
    pipe(
      items.items,
      Arr.map((item): Frame => new Map([[loop, item]])),
    ),
  ]);
};

const repeatIn: From<Machine, From<Repeat, Signal>> = (machine) => (repeat) =>
  Option.match(countedIn(machine)(repeat.count), {
    onNone: () => NEXT,
    onSome: (count) =>
      loopIn(machine)([repeat.body, Arr.map(countUp([ZERO, count]), (): Frame => new Map())]),
  });

const assignmentIn: From<Machine, From<Assign, Signal>> = (machine) => (assign) => {
  Option.match(Option.fromNullishOr(assign.target.ref), {
    onNone: () => NOTHING,
    onSome: (target) => {
      assignIn(machine)([target, machine.value(assign.value)]);
    },
  });
  return NEXT;
};

const callStatementIn: From<Machine, From<CallStatement, Signal>> = (machine) => (call) => {
  const args = pipe(
    call.args,
    Arr.map((arg) => machine.value(arg)),
  );
  Option.match(Option.fromNullishOr(call.callee.ref), {
    onNone: () => NOTHING,
    onSome: (fn) => machine.call([fn, args, call]),
  });
  return NEXT;
};

const setIn: From<Machine, From<readonly [Binding, Value], void>> =
  (machine) =>
  ([binding, value]) => {
    Option.match(Arr.last(machine.scope.frames), {
      onNone: () => machine.scope.state.globals.set(binding, value),
      onSome: (frame) => frame.set(binding, value),
    });
  };

export const runStatement: From<Machine, From<Statement, Signal>> = (machine) => (node) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("$type")({
      Bar: (bar) => {
        machine.scope.state.bars.push(machine.expand(bar));
        return NEXT;
      },
      Fn: () => NEXT,
      Let: (binding) => {
        setIn(machine)([binding, machine.value(binding.value)]);
        return NEXT;
      },
      Assign: assignmentIn(machine),
      CallStatement: callStatementIn(machine),
      Return: (back): Signal => ({
        kind: "return",
        value: Option.match(Option.fromNullishOr(back.value), {
          onNone: () => NOTHING,
          onSome: (value) => machine.value(value),
        }),
      }),
      If: ifIn(machine),
      For: forIn(machine),
      Repeat: repeatIn(machine),
      While: whileIn(machine),
    }),
  );
