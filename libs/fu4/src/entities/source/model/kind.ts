import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { InputKind } from "#/shared/config/index.ts";

const SEPARATOR = "/";
const WORKFLOWS = ".github/workflows/";
const YAML = /\.ya?ml$/u;
const ACTION = /^action\.ya?ml$/u;
const DEPENDABOT = /^\.github\/dependabot\.ya?ml$/u;
const PRE_COMMIT = /^\.pre-commit-(?:config|hooks)\.yaml$/u;

const baseName = (path: string): string =>
  pipe(
    Str.split(SEPARATOR)(path),
    Arr.last,
    Option.getOrElse(() => path),
  );

export const kindOf = (path: string): Option.Option<InputKind> => {
  if (DEPENDABOT.test(path)) {
    return Option.some("dependabot");
  }
  if (PRE_COMMIT.test(path)) {
    return Option.some("pre-commit");
  }
  if (ACTION.test(baseName(path))) {
    return Option.some("action");
  }
  if (Str.includes(WORKFLOWS)(path) && YAML.test(path)) {
    return Option.some("workflow");
  }
  return Option.none();
};
