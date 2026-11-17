import { Array as Arr, Option, Predicate, pipe } from "effect";

import type { Y8Config } from "#/shared/config/index.ts";

const MARKDOWN = "*.md";

const hasSection = (value: unknown): value is { readonly y8: Y8Config } =>
  Predicate.hasProperty(value, "y8") && Predicate.isObject(value.y8);

export const y8Section = (config: unknown): Y8Config =>
  pipe(
    Option.liftPredicate(config, hasSection),
    Option.map((value) => value.y8),
    Option.getOrElse((): Y8Config => ({})),
  );

export interface PathspecInput {
  readonly config: Y8Config;
  readonly patterns?: readonly string[];
}

export const markdownPathspecs = ({
  config,
  patterns = [MARKDOWN],
}: PathspecInput): readonly string[] => [
  ...patterns,
  ...pipe(
    config.ignores ?? [],
    Arr.map((glob) => `:(glob,exclude)${glob}`),
  ),
];
