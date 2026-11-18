import { Option, Record as Rec, String as Str, pipe } from "effect";

import { ANY, STRING, strict } from "#/entities/expression/index.ts";
import type { ObjectType } from "#/entities/expression/index.ts";
import { containsExpression } from "#/entities/workflow/index.ts";
import type { ExecAction, Step } from "#/entities/workflow/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import type { ExprEnv } from "./env.ts";
import type { Scope } from "./job-vars.ts";
import { GITHUB_SCRIPT, actionOutputsOf } from "./outputs.ts";
import { checkEnv, checkIf } from "./sections.ts";
import { checkBool, checkNumber, checkScript, checkString } from "./strings.ts";

const WITH = "jobs.<job_id>.steps.with";

const checkAction = (env: ExprEnv, action: ExecAction): Option.Option<Text> => {
  const uses = Option.fromNullishOr(action.uses);
  checkString(env)(action.uses, "");
  const script = Option.exists(uses, (found) => Str.startsWith(GITHUB_SCRIPT)(found.value));
  for (const [id, input] of Rec.toEntries(action.inputs ?? {})) {
    if (script && id === "script") {
      checkScript(env)(input.value, WITH);
    } else {
      checkString(env)(input.value, WITH);
    }
  }
  checkString(env)(action.entrypoint, WITH);
  checkString(env)(action.args, WITH);
  return uses;
};

const checkExec = (env: ExprEnv, step: Step): Option.Option<Text> => {
  const exec = Option.fromNullishOr(step.exec);
  if (Option.isNone(exec)) {
    return Option.none();
  }
  if (exec.value.type === "action") {
    return checkAction(env, exec.value);
  }
  checkScript(env)(exec.value.run, "jobs.<job_id>.steps.run");
  checkString(env)(exec.value.shell, "");
  checkString(env)(exec.value.workingDirectory, "jobs.<job_id>.steps.working-directory");
  return Option.none();
};

const baseOf = (steps: ObjectType, id: Text): ObjectType => {
  if (containsExpression(id.value)) {
    return { ...steps, mapped: Option.some(ANY) };
  }
  return steps;
};

const checkId = (env: ExprEnv, id: Option.Option<Text>): void => {
  const dynamic = pipe(
    id,
    Option.filter((found) => containsExpression(found.value)),
  );
  for (const text of Option.toArray(dynamic)) {
    checkString(env)(text, "");
  }
};

const withStep =
  (scope: Scope, id: Text, uses: Option.Option<Text>) =>
  (steps: ObjectType): ObjectType => {
    const base = baseOf(steps, id);
    const outputs = actionOutputsOf(scope.env)(scope.project)(uses);
    return {
      ...base,
      props: Rec.set(
        base.props,
        Str.toLowerCase(id.value),
        strict({ outputs, conclusion: STRING, outcome: STRING }),
      ),
    };
  };

const checkStepRuntime = (env: ExprEnv, step: Step): void => {
  checkEnv(env)(step.env, "jobs.<job_id>.steps.env");
  checkBool(env)(step.continueOnError, "jobs.<job_id>.steps.continue-on-error");
  checkNumber(env)(
    step.timeoutMinutes,
    "float number value",
    "jobs.<job_id>.steps.timeout-minutes",
  );
};

export const checkStep =
  (scope: Scope) =>
  (step: Step, steps: Option.Option<ObjectType>): Option.Option<ObjectType> => {
    const { env } = scope;
    checkString(env)(step.name, "jobs.<job_id>.steps.name");
    checkIf(env)(step.condition, "jobs.<job_id>.steps.if");
    const uses = checkExec(env, step);
    checkStepRuntime(env, step);
    const id = Option.fromNullishOr(step.id);
    checkId(env, id);
    return Option.match(id, {
      onNone: () => steps,
      onSome: (found) => pipe(steps, Option.map(withStep(scope, found, uses))),
    });
  };
