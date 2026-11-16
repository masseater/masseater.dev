import { Array as Arr, Match, Option, pipe } from "effect";
import type { Predicate } from "effect";
import type { AstNode } from "langium";

import { isLet, isSong } from "#generated/langium/ast.ts";
import type { Bar, Binding, Builtin, Let } from "#generated/langium/ast.ts";

import { problemAt } from "./problem.ts";
import type { From, Problem } from "./problem.ts";
import { NOTHING, numberValue } from "./values.ts";
import type { Value } from "./values.ts";

export const STEP_LIMIT = 1_000_000;
export const DEPTH_LIMIT = 256;
const SEED = 20_260_916;
const MULTIPLIER = 48_271;
const MODULUS = 2_147_483_647;
const ZERO = 0;
const ONE = 1;

export interface State {
  steps: number;
  depth: number;
  halted: boolean;
  seed: number;
  readonly problems: Problem[];
  readonly bars: Bar[];
  readonly globals: Map<AstNode, Value>;
}

export type Frames = readonly Map<AstNode, Value>[];

export interface Scope {
  readonly state: State;
  readonly frames: Frames;
}

export interface Fault {
  readonly node: AstNode;
  readonly message: string;
}

export const freshState = (): State => ({
  steps: ZERO,
  depth: ZERO,
  halted: false,
  seed: SEED,
  problems: [],
  bars: [],
  globals: new Map(),
});

export const failIn: From<State, From<Fault, Value>> =
  (state) =>
  ({ node, message }) => {
    if (!state.halted) {
      state.problems.push(problemAt(node)("$type")(message));
    }
    state.halted = true;
    return NOTHING;
  };

export const tickIn: From<State, From<AstNode, boolean>> = (state) => (node) => {
  state.steps += ONE;
  if (state.steps > STEP_LIMIT) {
    failIn(state)({
      node,
      message: `評価が手数の上限（${String(STEP_LIMIT)}）を超えました。止まらない繰り返しか再帰がないか確かめてください`,
    });
  }
  return !state.halted;
};

const nextRandom: From<State, number> = (state) => {
  state.seed = (state.seed * MULTIPLIER) % MODULUS;
  return (state.seed - ONE) / (MODULUS - ONE);
};

export const isTopLevel: Predicate.Refinement<AstNode, Let> = (node): node is Let =>
  isLet(node) && isSong(node.$container);

export const frameHolding: From<Frames, From<Binding, Option.Option<Map<AstNode, Value>>>> =
  (frames) => (binding) =>
    pipe(
      Arr.reverse(frames),
      Arr.findFirst((frame) => frame.has(binding)),
    );

export const countUp: From<readonly [number, number], readonly number[]> = ([from, to]) => {
  const items: number[] = [];
  for (let current = from; current < to; current += ONE) {
    items.push(current);
  }
  return items;
};

export const numberOf: From<Value, number> = (value) => {
  if (value.kind === "number") {
    return value.value;
  }
  return Number.NaN;
};

const at: From<readonly Value[], From<number, Value>> = (args) => (index) =>
  pipe(
    Arr.get(args, index),
    Option.getOrElse(() => NOTHING),
  );

const boundsOf: From<readonly Value[], readonly [number, number]> = (args) => {
  const first = numberOf(at(args)(ZERO));
  if (args.length === ONE) {
    return [ZERO, first];
  }
  return [first, numberOf(at(args)(ONE))];
};

const rangeOf: From<State, From<readonly [Builtin, readonly Value[]], Value>> =
  (state) =>
  ([node, args]) => {
    const bounds = boundsOf(args);
    const whole = pipe(
      bounds,
      Arr.every((bound) => Number.isInteger(bound)),
    );
    if (!whole) {
      return failIn(state)({ node, message: "range には整数を渡します" });
    }
    return {
      kind: "list",
      items: pipe(
        countUp(bounds),
        Arr.map((item) => numberValue(item)),
      ),
    };
  };

const lengthOf: From<Value, Value> = (value) => {
  if (value.kind === "list") {
    return numberValue(value.items.length);
  }
  if (value.kind === "string") {
    return numberValue(value.value.length);
  }
  return numberValue(ZERO);
};

const pushed: From<readonly Value[], Value> = (args) => {
  const list = at(args)(ZERO);
  if (list.kind !== "list") {
    return list;
  }
  return { kind: "list", items: Arr.append(list.items, at(args)(ONE)) };
};

export const builtinIn: From<State, From<readonly [Builtin, readonly Value[]], Value>> =
  (state) =>
  ([node, args]) =>
    Match.value(node.name).pipe(
      Match.when("range", () => rangeOf(state)([node, args])),
      Match.when("len", () => lengthOf(at(args)(ZERO))),
      Match.when("push", () => pushed(args)),
      Match.when("floor", () => {
        const amount = numberOf(at(args)(ZERO));
        return numberValue(Math.floor(amount));
      }),
      Match.orElse(() => {
        const low = numberOf(at(args)(ZERO));
        const high = numberOf(at(args)(ONE));
        return numberValue(low + nextRandom(state) * (high - low));
      }),
    );
