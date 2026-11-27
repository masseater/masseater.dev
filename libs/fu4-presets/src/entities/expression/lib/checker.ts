import { Option, Record as Rec, pipe } from "effect";

import { tokenOf } from "#/entities/expression/model/ast.ts";
import type { Expr, ExprError } from "#/entities/expression/model/ast.ts";
import { merge } from "#/entities/expression/model/merge.ts";
import { STRING, isStrict, mapOf, objectOf, strict } from "#/entities/expression/model/types.ts";
import type { ExprType, ObjectType } from "#/entities/expression/model/types.ts";

import { workflowKey } from "./availability.ts";
import type { Availability } from "./availability.ts";
import { checkExpr } from "./check.ts";
import { documented } from "./contexts.ts";
import type { TypeEnv, Scope } from "./scope.ts";
import { untrusted } from "./untrusted.ts";
import type { Untrusted } from "./untrusted.ts";

export interface Checked {
  readonly type: ExprType;
  readonly errors: readonly ExprError[];
}

export interface CheckerOptions {
  readonly untrusted: boolean;
  readonly configVars: Option.Option<readonly string[]>;
}

export interface Checker {
  readonly setVar: (name: string, type: ExprType) => void;
  readonly removeVar: (name: string) => void;
  readonly updateSecrets: (type: ObjectType) => void;
  readonly updateInputs: (type: ObjectType) => void;
  readonly updateDispatchInputs: (type: ObjectType) => void;
  readonly setWorkflowKey: (key: string) => void;
  readonly setAvailability: (availability: Availability) => void;
  readonly check: (expr: Expr) => Checked;
}

const GLOBALS: Readonly<Record<string, ExprType>> = {
  github: documented("github"),
  job: documented("job"),
  runner: documented("runner"),
  strategy: documented("strategy"),
  env: mapOf(STRING),
  secrets: mapOf(STRING),
  vars: mapOf(STRING),
  steps: strict(),
  matrix: strict(),
  needs: strict(),
  inputs: strict(),
};

const DEFAULT_SECRETS: Readonly<Record<string, ExprType>> = {
  github_token: STRING,
  actions_step_debug: STRING,
  actions_runner_debug: STRING,
};

const mergedInputs = (current: Option.Option<ExprType>, type: ObjectType): ExprType =>
  pipe(
    current,
    Option.filter(
      (found) => found.kind === "object" && !(Rec.isEmptyRecord(found.props) && isStrict(found)),
    ),
    Option.match({ onNone: () => type, onSome: (found) => merge(found)(type) }),
  );

const withEventInputs = (github: ExprType, type: ObjectType): ExprType => {
  if (github.kind !== "object") {
    return github;
  }
  const event = Rec.get(github.props, "event");
  if (Option.isNone(event) || event.value.kind !== "object") {
    return github;
  }
  const inputs = strict(
    pipe(
      type.props,
      Rec.map(() => STRING),
    ),
  );
  const updated = objectOf({ ...event.value.props, inputs })(event.value.mapped);
  return objectOf({ ...github.props, event: updated })(github.mapped);
};

const run = (env: TypeEnv, tracker: Option.Option<Untrusted>, expr: Expr): Checked => {
  const errors: ExprError[] = [];
  const scope: Scope = {
    env,
    fail: (at, message) => {
      const token = tokenOf(at);
      errors.push({ message, line: token.line, column: token.column });
    },
    check: (node) => {
      for (const found of Option.toArray(tracker)) {
        found.enter(node);
      }
      const type = checkExpr(scope)(node);
      for (const found of Option.toArray(tracker)) {
        found.leave(node);
      }
      return type;
    },
  };
  const type = scope.check(expr);
  const extra = Option.match(tracker, { onNone: () => [], onSome: (found) => found.finish() });
  return { type, errors: [...errors, ...extra] };
};

export const checkerOf = (options: CheckerOptions): Checker => {
  let env: TypeEnv = { vars: GLOBALS, contexts: [], special: [], configVars: options.configVars };
  const setVar = (name: string, type: ExprType): void => {
    env = { ...env, vars: { ...env.vars, [name]: type } };
  };
  const setAvailability = ({ contexts, functions }: Availability): void => {
    env = { ...env, contexts, special: functions };
  };
  const updateInputs = (type: ObjectType): void => {
    setVar("inputs", mergedInputs(Rec.get(env.vars, "inputs"), type));
  };
  return {
    setVar,
    removeVar: (name): void => {
      env = { ...env, vars: Rec.remove(env.vars, name) };
    },
    updateSecrets: (type): void => {
      setVar("secrets", strict({ ...DEFAULT_SECRETS, ...type.props }));
    },
    updateInputs,
    updateDispatchInputs: (type): void => {
      updateInputs(type);
      for (const github of Option.toArray(Rec.get(env.vars, "github"))) {
        setVar("github", withEventInputs(github, type));
      }
    },
    setWorkflowKey: (key): void => {
      setAvailability(
        Option.getOrElse(workflowKey(key), (): Availability => ({ contexts: [], functions: [] })),
      );
    },
    setAvailability,
    check: (expr) =>
      run(
        env,
        Option.liftPredicate(options.untrusted, Boolean).pipe(Option.map(() => untrusted())),
        expr,
      ),
  };
};
