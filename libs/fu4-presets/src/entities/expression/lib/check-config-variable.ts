import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Expr } from "#/entities/expression/model/ast.ts";
import { quote, sortedQuotes } from "#/shared/text/index.ts";

import { CONFIG_NAME } from "./scope.ts";
import type { Scope } from "./scope.ts";

const NOTE =
  "note: see the convention at https://docs.github.com/en/actions/learn-github-actions/variables#naming-conventions-for-configuration-variables";
const NAME = /^[\d_a-z]*$/u;

const definedError = (property: string, defined: readonly string[]): Option.Option<string> => {
  if (Arr.isReadonlyArrayEmpty(defined)) {
    return Option.some(
      `no configuration variable is allowed since the variables list is empty in ${CONFIG_NAME}. you may forget adding the variable ${quote(property)} to the list`,
    );
  }
  if (
    pipe(
      defined,
      Arr.some((name) => Str.toLowerCase(name) === property),
    )
  ) {
    return Option.none();
  }
  return Option.some(
    `undefined configuration variable ${quote(property)}. defined configuration variables in ${CONFIG_NAME} are ${sortedQuotes(defined)}`,
  );
};

const configError = (scope: Scope, property: string): Option.Option<string> => {
  if (Str.startsWith("github_")(property)) {
    return Option.some(
      `configuration variable name ${quote(property)} must not start with the GITHUB_ prefix (case insensitive). ${NOTE}`,
    );
  }
  if (!NAME.test(property)) {
    return Option.some(
      `configuration variable name ${quote(property)} can only contain alphabets, decimal numbers, and '_'. ${NOTE}`,
    );
  }
  return pipe(
    scope.env.configVars,
    Option.flatMap((defined) => definedError(property, defined)),
  );
};

export const checkConfigVariable =
  (scope: Scope) =>
  (expr: Expr, property: string): void => {
    for (const message of Option.toArray(configError(scope, property))) {
      scope.fail(expr, message);
    }
  };
