import { Array as Arr, Option, Predicate, pipe } from "effect";

import { flattenConfig } from "#/entities/rule/index.ts";
import type { I68Config } from "#/shared/config/index.ts";

const SONGS = "*.fumx";

const hasSection = (value: unknown): value is { readonly i68: I68Config } =>
  Predicate.hasProperty(value, "i68") && Predicate.isObject(value.i68);

export const i68Section = (config: unknown): I68Config =>
  pipe(
    Option.liftPredicate(config, hasSection),
    Option.map((value) => flattenConfig(value.i68)),
    Option.getOrElse((): I68Config => ({})),
  );

export interface PathspecInput {
  readonly config: I68Config;
  readonly patterns?: readonly string[];
}

export const songPathspecs = ({ config, patterns = [SONGS] }: PathspecInput): readonly string[] => [
  ...patterns,
  ...pipe(
    config.ignores ?? [],
    Arr.map((glob) => `:(glob,exclude)${glob}`),
  ),
];
