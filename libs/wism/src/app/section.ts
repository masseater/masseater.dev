import { Array as Arr, Option, Predicate, pipe } from "effect";

import type { WismConfig } from "#/shared/config/index.ts";

const UNOWNED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
  ":(exclude,attr:linguist-documentation)",
];

const hasSection = (value: unknown): value is { readonly wism: WismConfig } =>
  Predicate.hasProperty(value, "wism") && Predicate.isObject(value.wism);

export const wismSection = (config: unknown): WismConfig =>
  pipe(
    Option.liftPredicate(config, hasSection),
    Option.map((value) => value.wism),
    Option.getOrElse((): WismConfig => ({})),
  );

export const wismPathspecs = (config: WismConfig): readonly string[] => [
  ".",
  ...UNOWNED,
  ...pipe(
    config.ignores ?? [],
    Arr.map((glob) => `:(glob,exclude)${glob}`),
  ),
];
