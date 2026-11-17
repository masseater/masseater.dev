import { Array as Arr, Option, Predicate, pipe } from "effect";

import type { RuleContext } from "#/shared/config/index.ts";

export interface OptionKey<Value> {
  readonly key: string;
  readonly fallback: Value;
}

const isList = (value: unknown): value is readonly unknown[] => Arr.isArray(value);

const strings = (value: readonly unknown[]): readonly string[] =>
  pipe(value, Arr.filter(Predicate.isString));

export const stringsOption =
  ({ key, fallback }: OptionKey<readonly string[]>) =>
  (context: RuleContext): readonly string[] =>
    pipe(
      Option.fromNullishOr(context.options[key]),
      Option.filter(isList),
      Option.map(strings),
      Option.getOrElse(() => fallback),
    );

export const stringListsOption =
  (key: string) =>
  (context: RuleContext): readonly (readonly string[])[] =>
    pipe(
      Option.fromNullishOr(context.options[key]),
      Option.filter(isList),
      Option.map((items) => pipe(items, Arr.filter(isList), Arr.map(strings))),
      Option.getOrElse((): readonly (readonly string[])[] => []),
    );

export const numberOption =
  ({ key, fallback }: OptionKey<number>) =>
  (context: RuleContext): number =>
    pipe(
      Option.fromNullishOr(context.options[key]),
      Option.filter(Predicate.isNumber),
      Option.getOrElse(() => fallback),
    );

export const stringOption =
  (key: string) =>
  (context: RuleContext): Option.Option<string> =>
    pipe(Option.fromNullishOr(context.options[key]), Option.filter(Predicate.isString));
