import { Array as Arr, Match, Option, pipe } from "effect";

import type { Binary } from "#generated/langium/ast.ts";

import type { From } from "./problem.ts";
import { MEASURES, fits, scalar } from "./types.ts";
import type { Scalar, Type } from "./types.ts";
import { boolValue, numberValue, sameValue } from "./values.ts";
import type { Value } from "./values.ts";

const CENTS = 100;
const EMPTY = 0;

export type Operator = Binary["operator"];

export type Outcome =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly message: string };

export interface Pair {
  readonly left: Value;
  readonly right: Value;
}

export interface Rule {
  readonly result: Type;
  readonly apply: From<Pair, Outcome>;
}

interface Operands {
  readonly operator: Operator;
  readonly left: Type;
  readonly right: Type;
}

const ok: From<Value, Outcome> = (value) => ({ ok: true, value });

const amountOf: From<Value, number> = (value) =>
  Match.value(value).pipe(
    Match.discriminatorsExhaustive("kind")({
      duration: (duration) => duration.ticks,
      pitch: (pitch) => pitch.midi + pitch.cents / CENTS,
      number: (number) => number.value,
      decibels: (amount) => amount.value,
      percent: (amount) => amount.value,
      hertz: (amount) => amount.value,
      time: (amount) => amount.value,
      semitones: (amount) => amount.value,
      string: () => Number.NaN,
      bool: () => Number.NaN,
      list: () => Number.NaN,
      none: () => Number.NaN,
    }),
  );

const ARITHMETIC: Readonly<Record<string, From<readonly [number, number], number>>> = {
  "+": ([left, right]) => left + right,
  "-": ([left, right]) => left - right,
  "*": ([left, right]) => left * right,
  "/": ([left, right]) => left / right,
  mod: ([left, right]) => left % right,
};

const COMPARE: Readonly<Record<string, From<readonly [number, number], boolean>>> = {
  "<": ([left, right]) => left < right,
  "<=": ([left, right]) => left <= right,
  ">": ([left, right]) => left > right,
  ">=": ([left, right]) => left >= right,
};

const durationMade: From<number, Outcome> = (ticks) => {
  if (!Number.isInteger(ticks) || ticks <= EMPTY) {
    return { ok: false, message: "音価が正の長さになりません" };
  }
  return ok({ kind: "duration", ticks });
};

const pitchMade: From<number, Outcome> = (amount) => {
  const midi = Math.round(amount);
  return ok({ kind: "pitch", midi, cents: Math.round((amount - midi) * CENTS) });
};

const made: From<Scalar, From<number, Outcome>> = (kind) => (amount) => {
  if (!Number.isFinite(amount)) {
    return { ok: false, message: "計算の結果が数になりません" };
  }
  return Match.value(kind).pipe(
    Match.when("duration", () => durationMade(amount)),
    Match.when("pitch", () => pitchMade(amount)),
    Match.when(
      (name): name is (typeof MEASURES)[number] => Arr.contains(MEASURES, name),
      (measure) => ok({ kind: measure, value: amount }),
    ),
    Match.orElse(() => ok(numberValue(amount))),
  );
};

const numeric: From<Operator, From<Scalar, From<Pair, Outcome>>> =
  (operator) =>
  (kind) =>
  ({ left, right }) =>
    pipe(
      Option.fromNullishOr(ARITHMETIC[operator]),
      Option.match({
        onNone: () => ({ ok: false, message: `${operator} は数に使えません` }),
        onSome: (compute) => made(kind)(compute([amountOf(left), amountOf(right)])),
      }),
    );

const COUNTABLE: readonly string[] = ["number", ...MEASURES, "duration"];

const scalarOf: From<Type, Option.Option<Scalar>> = (type) => {
  if (type.kind === "list" || type.kind === "unknown") {
    return Option.none();
  }
  return Option.some(type.kind);
};

const ruled: From<Scalar, From<Operator, Rule>> = (kind) => (operator) => ({
  result: scalar(kind),
  apply: numeric(operator)(kind),
});

const additiveRule: From<Operands, Option.Option<Rule>> = ({ operator, left, right }) => {
  if (operator !== "+" && operator !== "-") {
    return Option.none();
  }
  if (left.kind === "pitch" && right.kind === "semitones") {
    return Option.some(ruled("pitch")(operator));
  }
  if (operator === "-" && left.kind === "pitch" && right.kind === "pitch") {
    return Option.some(ruled("semitones")(operator));
  }
  return pipe(
    scalarOf(left),
    Option.filter((kind) => kind === right.kind && Arr.contains(COUNTABLE, kind)),
    Option.map((kind) => ruled(kind)(operator)),
  );
};

const scalingRule: From<Operands, Option.Option<Rule>> = ({ operator, left, right }) => {
  if (operator === "*" && left.kind === "number") {
    return pipe(
      scalarOf(right),
      Option.filter((kind) => Arr.contains(COUNTABLE, kind)),
      Option.map((kind) => ruled(kind)(operator)),
    );
  }
  if (operator !== "*" && operator !== "/" && operator !== "mod") {
    return Option.none();
  }
  const counted = pipe(
    scalarOf(left),
    Option.filter((kind) => Arr.contains(COUNTABLE, kind)),
  );
  if (right.kind === "number") {
    return pipe(
      counted,
      Option.map((kind) => ruled(kind)(operator)),
    );
  }
  return pipe(
    counted,
    Option.filter((kind) => operator === "/" && kind === right.kind),
    Option.map(() => ruled("number")(operator)),
  );
};

const joinedValue: From<Pair, Outcome> = ({ left, right }) => {
  if (left.kind === "string" && right.kind === "string") {
    return ok({ kind: "string", value: `${left.value}${right.value}` });
  }
  if (left.kind === "list" && right.kind === "list") {
    return ok({ kind: "list", items: Arr.appendAll(left.items, right.items) });
  }
  return { ok: false, message: "つなげられない値です" };
};

const joinRule: From<Operands, Option.Option<Rule>> = ({ operator, left, right }) => {
  const joinable =
    (left.kind === "string" && right.kind === "string") ||
    (left.kind === "list" && right.kind === "list" && fits(left)(right));
  if (operator !== "+" || !joinable) {
    return Option.none();
  }
  return Option.some({ result: left, apply: joinedValue });
};

const equalityRule: From<Operands, Option.Option<Rule>> = ({ operator, left, right }) => {
  if ((operator !== "==" && operator !== "!=") || !fits(left)(right)) {
    return Option.none();
  }
  const wanted = operator === "==";
  return Option.some({
    result: scalar("bool"),
    apply: ({ left: first, right: second }) => ok(boolValue(sameValue(first)(second) === wanted)),
  });
};

const orderRule: From<Operands, Option.Option<Rule>> = ({ operator, left, right }) =>
  pipe(
    Option.fromNullishOr(COMPARE[operator]),
    Option.filter(
      () => left.kind === right.kind && Arr.contains([...COUNTABLE, "pitch"], left.kind),
    ),
    Option.map((compare) => ({
      result: scalar("bool"),
      apply: ({ left: first, right: second }: Pair) => {
        const holds = compare([amountOf(first), amountOf(second)]);
        return ok(boolValue(holds));
      },
    })),
  );

const truthOf: From<Value, boolean> = (value) => value.kind === "bool" && value.value;

const logicRule: From<Operands, Option.Option<Rule>> = ({ operator, left, right }) => {
  if ((operator !== "and" && operator !== "or") || left.kind !== "bool" || right.kind !== "bool") {
    return Option.none();
  }
  const both = operator === "and";
  return Option.some({
    result: scalar("bool"),
    apply: ({ left: first, right: second }) => {
      if (both) {
        return ok(boolValue(truthOf(first) && truthOf(second)));
      }
      return ok(boolValue(truthOf(first) || truthOf(second)));
    },
  });
};

const RULES: readonly From<Operands, Option.Option<Rule>>[] = [
  additiveRule,
  scalingRule,
  joinRule,
  equalityRule,
  orderRule,
  logicRule,
];

export const ruleOf: From<Operands, Option.Option<Rule>> = (operands) =>
  pipe(
    RULES,
    Arr.findFirst((rule) => rule(operands)),
  );

export const elementOf: From<Type, Option.Option<Type>> = (type) => {
  if (type.kind === "list") {
    return Option.some(type.element);
  }
  return Option.none();
};
