import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Evaluation, FunctionName } from "#/entities/expression-tree/model/types.ts";

import {
  booleanOf,
  display,
  fromJson,
  isPrimitive,
  semaEquals,
  stringOf,
  toJson,
  upperSpecial,
} from "./evaluation.ts";
import { formatTemplate } from "./format.ts";

const NAMES = new Set<string>([
  "contains",
  "startswith",
  "endswith",
  "format",
  "join",
  "tojson",
  "fromjson",
  "hashfiles",
  "case",
  "success",
  "always",
  "cancelled",
  "failure",
]);
const NO_ARGS = 0;
const ONE_ARG = 1;
const PAIR = 2;
const CASE_MINIMUM = 3;
const ODD = 1;
const DEFAULT_ARM = 1;

export const functionOf = (name: string): Option.Option<FunctionName> =>
  Option.liftPredicate(Str.toLowerCase(name), (each): each is FunctionName => NAMES.has(each));

const ARITY: Readonly<Record<FunctionName, (count: number) => boolean>> = {
  contains: (count) => count === PAIR,
  startswith: (count) => count === PAIR,
  endswith: (count) => count === PAIR,
  tojson: (count) => count === ONE_ARG,
  fromjson: (count) => count === ONE_ARG,
  join: (count) => count >= ONE_ARG && count <= PAIR,
  hashfiles: (count) => count >= ONE_ARG,
  case: (count) => count >= CASE_MINIMUM && count % PAIR === ODD,
  success: (count) => count === NO_ARGS,
  always: (count) => count === NO_ARGS,
  cancelled: (count) => count === NO_ARGS,
  failure: (count) => count === NO_ARGS,
  format: () => true,
};

export const checkArity =
  (func: FunctionName) =>
  (count: number): Option.Option<string> =>
    Option.liftPredicate(func, (each) => !ARITY[each](count));

const format = (args: readonly Evaluation[]): Option.Option<Evaluation> =>
  Option.map(formatTemplate(args), stringOf);

const pairOf = (args: readonly Evaluation[]): Option.Option<readonly [Evaluation, Evaluation]> => {
  const [first, second] = args;
  return Option.all([Option.fromNullishOr(first), Option.fromNullishOr(second)]);
};

const upperDisplay = (value: Evaluation): string => Str.toUpperCase(display(value));

const contains = (args: readonly Evaluation[]): Option.Option<Evaluation> =>
  Option.flatMap(pairOf(args), ([search, item]) => {
    if (search.type === "array") {
      const found = pipe(
        search.items,
        Arr.some((each) => semaEquals(each)(item)),
      );
      return Option.some(booleanOf(found));
    }
    if (search.type === "object") {
      return Option.none();
    }
    const matched = pipe(upperDisplay(search), Str.includes(upperDisplay(item)));
    return Option.some(booleanOf(matched));
  });

const affix =
  (test: (needle: string) => (haystack: string) => boolean) =>
  (args: readonly Evaluation[]): Option.Option<Evaluation> =>
    Option.map(pairOf(args), ([haystack, needle]) => {
      if (!isPrimitive(haystack) || !isPrimitive(needle)) {
        return booleanOf(false);
      }
      const matched = test(upperSpecial(display(needle)))(upperSpecial(display(haystack)));
      return booleanOf(matched);
    });

const join = (args: readonly Evaluation[]): Option.Option<Evaluation> =>
  Option.map(Arr.head(args), (value) => {
    const [, second] = args;
    const separator = Option.match(Option.fromNullishOr(second), {
      onNone: () => ",",
      onSome: display,
    });
    if (value.type === "array") {
      return pipe(value.items, Arr.map(display), Arr.join(separator), stringOf);
    }
    if (value.type === "object") {
      return stringOf("");
    }
    return stringOf(display(value));
  });

const caseOf = (args: readonly Evaluation[]): Option.Option<Evaluation> => {
  for (const [predicate, value] of Arr.chunksOf(Arr.dropRight(args, DEFAULT_ARM), PAIR)) {
    if (predicate.type !== "boolean") {
      return Option.none();
    }
    if (predicate.value) {
      return Option.fromNullishOr(value);
    }
  }
  return Arr.last(args);
};

const FUNCTIONS: Partial<
  Readonly<Record<FunctionName, (args: readonly Evaluation[]) => Option.Option<Evaluation>>>
> = {
  format,
  contains,
  startswith: affix(Str.startsWith),
  endswith: affix(Str.endsWith),
  tojson: (args) => Option.map(Arr.head(args), (value) => stringOf(toJson(value))),
  fromjson: (args) =>
    pipe(
      Arr.head(args),
      Option.map(display),
      Option.filter((text) => !Str.isEmpty(Str.trim(text))),
      Option.flatMap(fromJson),
    ),
  join,
  case: caseOf,
};

export const evaluateCall =
  (func: FunctionName) =>
  (args: readonly Evaluation[]): Option.Option<Evaluation> =>
    pipe(
      Option.fromNullishOr(FUNCTIONS[func]),
      Option.flatMap((evaluate) => evaluate(args)),
    );
