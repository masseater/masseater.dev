import { Array as Arr, Effect, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import { encodeJson, isJsonArray, isObject, isOpaque } from "./json-lines.ts";
import type { Json, Line } from "./json-lines.ts";

type Replaced<Value> = Readonly<{ value: Value; count: number }>;

type Replacer = (text: string) => Replaced<string>;

type Target = readonly [secret: string, ruleId: string];

type Targets = readonly Target[];

const NONE = 0;
const ONE = 1;

const countOf = <Value>(items: readonly Replaced<Value>[]): number =>
  Arr.reduce(items, NONE, (sum, item) => sum + item.count);

const valuesOf = <Value>(items: readonly Replaced<Value>[]): readonly Value[] =>
  pipe(
    items,
    Arr.map((item) => item.value),
  );

const byLongestTarget = Order.mapInput(
  Order.flip(Order.Number),
  ([secret]: Target) => secret.length,
);

const replaceOne = (state: Replaced<string>, [secret, ruleId]: Target): Replaced<string> => {
  if (!Str.includes(secret)(state.value)) {
    return state;
  }
  const parts = Str.split(secret)(state.value);
  return {
    value: Arr.join(parts, `[REDACTED:${ruleId}]`),
    count: state.count + parts.length - ONE,
  };
};

const replacerOf = (targets: Targets): Replacer => {
  const ordered = Arr.sort(targets, byLongestTarget);
  return (text) => Arr.reduce(ordered, { value: text, count: NONE }, replaceOne);
};

const replaceJson =
  (replace: Replacer) =>
  (value: Json): Replaced<Json> => {
    if (typeof value === "string") {
      return replace(value);
    }
    if (isJsonArray(value)) {
      const items = pipe(value, Arr.map(replaceJson(replace)));
      return { value: valuesOf(items), count: countOf(items) };
    }
    if (isObject(value)) {
      const opaque = isOpaque(value);
      const entries = pipe(
        value,
        Rec.map((item, key): Replaced<Json> => {
          if (opaque(key)) {
            return { value: item, count: NONE };
          }
          return replaceJson(replace)(item);
        }),
      );
      return {
        value: pipe(
          entries,
          Rec.map((item) => item.value),
        ),
        count: countOf(Rec.values(entries)),
      };
    }
    return { value, count: NONE };
  };

const replaceRaw = (replace: Replacer, line: Line): Replaced<Line> => {
  const replaced = replace(line.raw);
  return { value: { raw: replaced.value, json: Option.none() }, count: replaced.count };
};

const replaceLine =
  (replace: Replacer) =>
  (line: Line): Effect.Effect<Replaced<Line>> =>
    Option.match(line.json, {
      onNone: () => Effect.succeed(replaceRaw(replace, line)),
      onSome: (json) => {
        const replaced = replaceJson(replace)(json);
        if (replaced.count === NONE) {
          return Effect.succeed({ value: line, count: NONE });
        }
        return encodeJson(replaced.value).pipe(
          Effect.map((raw) => ({
            value: { raw, json: Option.some(replaced.value) },
            count: replaced.count,
          })),
        );
      },
    });

const applyTargets =
  (targets: Targets) =>
  (lines: readonly Line[]): Effect.Effect<Replaced<readonly Line[]>> => {
    const replace = replaceLine(replacerOf(targets));
    return pipe(
      lines,
      Effect.forEach(replace),
      Effect.map((applied) => ({ value: valuesOf(applied), count: countOf(applied) })),
    );
  };

/** @internal */
export { applyTargets };
/** @internal */
export type { Replaced, Target, Targets };
