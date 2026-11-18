import { Array as Arr, Option, pipe } from "effect";

import { describe } from "#/entities/expression/index.ts";
import type { ExprType } from "#/entities/expression/index.ts";
import type { Bool, Float, Int } from "#/entities/workflow/index.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import type { ExprEnv, Typed } from "./env.ts";
import { checkExprsIn } from "./scan.ts";

const SINGLE = 1;
const EVALUATED_BADLY: readonly string[] = ["object", "array", "null"];

export type Maybe<Value> = Value | undefined;

const checkEvaluated = (env: ExprEnv, typed: readonly Typed[]): void => {
  for (const each of typed) {
    if (Arr.contains(EVALUATED_BADLY, each.type.kind)) {
      env.fail(
        each,
        `object, array, and null values should not be evaluated in template with \${{ }} but evaluating the value of type ${describe(each.type)}`,
      );
    }
  }
};

export const checkString =
  (env: ExprEnv) =>
  (text: Maybe<Text>, key: string): readonly Typed[] =>
    pipe(
      Option.fromNullishOr(text),
      Option.flatMap(checkExprsIn(env)({ untrusted: false, key })),
      Option.map((typed) => {
        checkEvaluated(env, typed);
        return typed;
      }),
      Option.getOrElse((): readonly Typed[] => []),
    );

export const checkStrings =
  (env: ExprEnv) =>
  (texts: readonly Text[], key: string): void => {
    for (const text of texts) {
      checkString(env)(text, key);
    }
  };

export const checkScript =
  (env: ExprEnv) =>
  (text: Maybe<Text>, key: string): void => {
    const typed = pipe(
      Option.fromNullishOr(text),
      Option.flatMap(checkExprsIn(env)({ untrusted: true, key })),
    );
    for (const found of Option.toArray(typed)) {
      checkEvaluated(env, found);
    }
  };

export const checkOne =
  (env: ExprEnv) =>
  (text: Maybe<Text>, what: string, key: string): Option.Option<ExprType> => {
    const found = Option.fromNullishOr(text);
    if (Option.isNone(found)) {
      return Option.none();
    }
    const typed = checkExprsIn(env)({ untrusted: false, key })(found.value);
    if (Option.isNone(typed)) {
      return Option.none();
    }
    if (typed.value.length !== SINGLE) {
      env.fail(
        found.value,
        `one \${{ }} expression should be included in ${quote(what)} value but got ${String(typed.value.length)} expressions`,
      );
      return Option.none();
    }
    return Option.map(Arr.last(typed.value), (last) => last.type);
  };

export interface Expected {
  readonly what: string;
  readonly name: string;
  readonly kinds: readonly string[];
}

export const expectType =
  (env: ExprEnv) =>
  (text: Text) =>
  (type: ExprType, expected: Expected): Option.Option<ExprType> => {
    if (Arr.contains(expected.kinds, type.kind)) {
      return Option.some(type);
    }
    env.fail(
      text,
      `type of expression at ${quote(expected.what)} must be ${expected.name} but found type ${describe(type)}`,
    );
    return Option.none();
  };

const expectedOf = (what: string, name: string): Expected => ({ what, name, kinds: [name, "any"] });

export const checkObjectType =
  (env: ExprEnv) =>
  (text: Text) =>
  (type: ExprType, what: string): Option.Option<ExprType> =>
    expectType(env)(text)(type, expectedOf(what, "object"));

const checkTyped =
  (env: ExprEnv, name: string) =>
  (text: Maybe<Text>, what: string, key: string): Option.Option<ExprType> =>
    pipe(
      Option.all([checkOne(env)(text, what, key), Option.fromNullishOr(text)]),
      Option.flatMap(([type, found]) => expectType(env)(found)(type, expectedOf(what, name))),
    );

export const checkObjectExpr = (env: ExprEnv): ReturnType<typeof checkTyped> =>
  checkTyped(env, "object");
export const checkArrayExpr = (env: ExprEnv): ReturnType<typeof checkTyped> =>
  checkTyped(env, "array");

export const checkBool =
  (env: ExprEnv) =>
  (value: Maybe<Bool>, key: string): void => {
    const expression = pipe(
      Option.fromNullishOr(value),
      Option.flatMap((found) => Option.fromNullishOr(found.expression)),
    );
    for (const text of Option.toArray(expression)) {
      const type = Option.filter(
        checkOne(env)(text, "bool value", key),
        (found) => found.kind !== "bool" && found.kind !== "any",
      );
      for (const found of Option.toArray(type)) {
        env.fail(text, `type of expression must be bool but found type ${describe(found)}`);
      }
    }
  };

export const checkNumber =
  (env: ExprEnv) =>
  (value: Maybe<Float | Int>, what: string, key: string): void => {
    for (const found of Option.toArray(Option.fromNullishOr(value))) {
      checkTyped(env, "number")(found.expression, what, key);
    }
  };
