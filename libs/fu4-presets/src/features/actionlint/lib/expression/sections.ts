import { Array as Arr, Option, Record as Rec, Result, String as Str, pipe } from "effect";

import { BOOL, assignable, describe, parse } from "#/entities/expression/index.ts";
import type { ExprType } from "#/entities/expression/index.ts";
import { containsExpression, isExpressionAssigned } from "#/entities/workflow/index.ts";
import type { Container, Env } from "#/entities/workflow/model/job-types.ts";
import type { Concurrency, Defaults } from "#/entities/workflow/model/types.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import type { ExprEnv } from "./env.ts";
import { checkNode, report } from "./scan.ts";
import { checkBool, checkObjectExpr, checkString, checkStrings } from "./strings.ts";
import type { Maybe } from "./strings.ts";

const CLOSE = "}}";
const SINGLE = 1;

export const checkEnv =
  (env: ExprEnv) =>
  (found: Maybe<Env>, key: string): void => {
    for (const vars of Option.toArray(Option.fromNullishOr(found))) {
      const expression = Option.fromNullishOr(vars.expression);
      if (Option.isSome(expression)) {
        checkObjectExpr(env)(expression.value, "env", key);
      } else {
        for (const each of Rec.values(vars.vars)) {
          checkString(env)(each.name, key);
          checkString(env)(each.value, key);
        }
      }
    }
  };

const childKeyOf = (key: string, child: string): string => {
  if (Str.isEmpty(child)) {
    return key;
  }
  return `${key}.${child}`;
};

const checkCredentials = (env: ExprEnv, container: Container, key: string): void => {
  for (const credentials of Option.toArray(Option.fromNullishOr(container.credentials))) {
    const credentialsKey = `${key}.credentials`;
    const expression = Option.fromNullishOr(credentials.expression);
    if (Option.isSome(expression)) {
      checkObjectExpr(env)(expression.value, "credentials", credentialsKey);
    } else {
      checkString(env)(credentials.username, credentialsKey);
      checkString(env)(credentials.password, credentialsKey);
    }
  }
};

export const checkContainer =
  (env: ExprEnv) =>
  (found: Maybe<Container>, key: string, child: string): void => {
    for (const container of Option.toArray(Option.fromNullishOr(found))) {
      const childKey = childKeyOf(key, child);
      checkString(env)(container.image, key);
      checkCredentials(env, container, childKey);
      checkEnv(env)(container.env, `${childKey}.env.<env_id>`);
      checkStrings(env)(container.ports, key);
      checkStrings(env)(container.volumes, key);
      checkString(env)(container.options, key);
    }
  };

export const checkConcurrency =
  (env: ExprEnv) =>
  (found: Maybe<Concurrency>, key: string): void => {
    for (const concurrency of Option.toArray(Option.fromNullishOr(found))) {
      checkString(env)(concurrency.group, key);
      checkBool(env)(concurrency.cancelInProgress, key);
    }
  };

export const checkDefaults =
  (env: ExprEnv) =>
  (found: Maybe<Defaults>, key: string): void => {
    const run = pipe(
      Option.fromNullishOr(found),
      Option.flatMap((defaults) => Option.fromNullishOr(defaults.run)),
    );
    for (const each of Option.toArray(run)) {
      checkString(env)(each.shell, key);
      checkString(env)(each.workingDirectory, key);
    }
  };

const embedded = (env: ExprEnv, text: Text, key: string): Option.Option<ExprType> => {
  const typed = checkString(env)(text, key);
  return pipe(
    Arr.head(typed),
    Option.filter(() => typed.length === SINGLE && isExpressionAssigned(text.value)),
    Option.map((one) => one.type),
  );
};

const bare = (env: ExprEnv, text: Text, key: string): Option.Option<ExprType> => {
  const parsed = parse(`${text.value}${CLOSE}`).result;
  if (Result.isFailure(parsed)) {
    report(env)(text)(parsed.failure);
    return Option.none();
  }
  return checkNode(env)({ untrusted: false, key })(parsed.success, text);
};

const conditionOf = (env: ExprEnv, text: Text, key: string): Option.Option<ExprType> => {
  if (containsExpression(text.value)) {
    return embedded(env, text, key);
  }
  return bare(env, text, key);
};

export const checkIf =
  (env: ExprEnv) =>
  (found: Maybe<Text>, key: string): void => {
    for (const text of Option.toArray(Option.fromNullishOr(found))) {
      const condition = conditionOf(env, text, key);
      const wrong = pipe(
        condition,
        Option.filter((type) => !assignable(BOOL)(type)),
      );
      for (const type of Option.toArray(wrong)) {
        env.fail(
          text,
          `"if" condition should be type "bool" but got type ${quote(describe(type))}`,
        );
      }
    }
  };
