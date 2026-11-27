import { Array as Arr, Option, String as Str, pipe } from "effect";

export type Predicate = (arg: string) => boolean;

export type Rest = Option.Option<readonly string[]>;

export interface Taken {
  readonly value: string;
  readonly rest: readonly string[];
}

const NEXT = 1;

export const is =
  (...values: readonly string[]): Predicate =>
  (arg) =>
    values.includes(arg);

export const isNot =
  (...values: readonly string[]): Predicate =>
  (arg) =>
    !values.includes(arg);

export const startsWith =
  (prefix: string): Predicate =>
  (arg) =>
    Str.startsWith(prefix)(arg);

export const isOption: Predicate = startsWith("-");

export const isOperand: Predicate = (arg) => !isOption(arg);

export const take =
  (predicate: Predicate) =>
  (args: readonly string[]): Option.Option<Taken> =>
    pipe(
      args,
      Arr.findFirstWithIndex(predicate),
      Option.map(([value, index]) => ({ value, rest: Arr.drop(args, index + NEXT) })),
    );

export const next = (args: readonly string[]): Option.Option<Taken> => take(() => true)(args);

export const after =
  (predicate: Predicate) =>
  (rest: Option.Option<readonly string[]>): Rest =>
    pipe(
      rest,
      Option.flatMap(take(predicate)),
      Option.map((taken) => taken.rest),
    );

export const passes =
  (...predicates: readonly Predicate[]) =>
  (rest: Option.Option<readonly string[]>): Rest =>
    Arr.matchLeft(predicates, {
      onEmpty: () => rest,
      onNonEmpty: (head, tail) => pipe(rest, after(head), passes(...tail)),
    });

export const reaches =
  (...predicates: readonly Predicate[]) =>
  (args: readonly string[]): boolean =>
    Option.some(args).pipe(passes(...predicates), Option.isSome);

export const thenEvery =
  (predicate: Predicate) =>
  (rest: Option.Option<readonly string[]>): boolean =>
    Option.exists(rest, Arr.every(predicate));
