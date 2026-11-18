import { Array as Arr, Predicate, pipe } from "effect";

const hasFunction =
  (value: unknown) =>
  (name: string): boolean =>
    Predicate.hasProperty(value, name) && Predicate.isFunction(value[name]);

export const exposes =
  <Addon>(names: readonly Extract<keyof Addon, string>[]) =>
  (value: unknown): value is Addon =>
    pipe(names, Arr.every(hasFunction(value)));
