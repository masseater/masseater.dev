import { Array as Arr, Option, Predicate, pipe } from "effect";

import type { Fu4Config } from "#/shared/config/index.ts";

const WORKFLOWS = [
  ".github/workflows/*.yml",
  ".github/workflows/*.yaml",
  ":(glob)**/action.yml",
  ":(glob)**/action.yaml",
  ".github/dependabot.yml",
  ".github/dependabot.yaml",
  ".pre-commit-config.yaml",
  ".pre-commit-hooks.yaml",
];

const hasSection = (value: unknown): value is { readonly fu4: Fu4Config } =>
  Predicate.hasProperty(value, "fu4") && Predicate.isObject(value.fu4);

export const fu4Section = (config: unknown): Fu4Config =>
  pipe(
    Option.liftPredicate(config, hasSection),
    Option.map((value) => value.fu4),
    Option.getOrElse((): Fu4Config => ({})),
  );

export interface PathspecInput {
  readonly config: Fu4Config;
  readonly patterns?: readonly string[];
}

export const workflowPathspecs = ({
  config,
  patterns = WORKFLOWS,
}: PathspecInput): readonly string[] => [
  ...patterns,
  ...pipe(
    config.ignores ?? [],
    Arr.map((glob) => `:(glob,exclude)${glob}`),
  ),
];
