import { Option, Record as Rec, pipe } from "effect";

import { describe } from "#/entities/expression/index.ts";
import type { Job, Runner } from "#/entities/workflow/index.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { checkCall } from "./call.ts";
import type { ExprEnv } from "./env.ts";
import type { Scope } from "./job-vars.ts";
import { checkConcurrency, checkContainer, checkDefaults, checkEnv, checkIf } from "./sections.ts";
import {
  checkBool,
  checkNumber,
  checkObjectExpr,
  checkOne,
  checkString,
  checkStrings,
} from "./strings.ts";
import type { Maybe } from "./strings.ts";

const RUNS_ON = "jobs.<job_id>.runs-on";
const LABEL_KINDS = new Set(["array", "string", "any"]);

const checkLabels = (env: ExprEnv, runner: Runner): void => {
  const expression = Option.fromNullishOr(runner.labelsExpression);
  if (Option.isNone(expression)) {
    checkStrings(env)(runner.labels, RUNS_ON);
    return;
  }
  const type = Option.filter(
    checkOne(env)(expression.value, 'runner label at "runs-on" section', RUNS_ON),
    (found) => !LABEL_KINDS.has(found.kind),
  );
  for (const found of Option.toArray(type)) {
    env.fail(
      expression.value,
      `type of expression at "runs-on" must be string or array but found type ${quote(describe(found))}`,
    );
  }
};

const checkRunsOn = (env: ExprEnv, job: Job): void => {
  for (const runner of Option.toArray(Option.fromNullishOr(job.runsOn))) {
    checkLabels(env, runner);
    checkString(env)(runner.group, RUNS_ON);
  }
};

const checkStrategy = (env: ExprEnv, job: Job): void => {
  for (const strategy of Option.toArray(Option.fromNullishOr(job.strategy))) {
    checkBool(env)(strategy.failFast, "jobs.<job_id>.strategy");
    checkNumber(env)(strategy.maxParallel, "integer value", "jobs.<job_id>.strategy");
  }
};

const checkServices = (env: ExprEnv, job: Job): void => {
  for (const services of Option.toArray(Option.fromNullishOr(job.services))) {
    checkObjectExpr(env)(services.expression, "services", "jobs.<job_id>.services");
    for (const service of Rec.values(services.value)) {
      checkContainer(env)(service.container, "jobs.<job_id>.services", "<service_id>");
    }
  }
};

const checkRuntime = (env: ExprEnv, job: Job): void => {
  checkBool(env)(job.continueOnError, "jobs.<job_id>.continue-on-error");
  checkNumber(env)(job.timeoutMinutes, "float number value", "jobs.<job_id>.timeout-minutes");
  checkContainer(env)(job.container, "jobs.<job_id>.container", "");
  checkServices(env, job);
  checkStrategy(env, job);
};

const snapshotIf = (job: Job): Maybe<Text> =>
  pipe(
    Option.fromNullishOr(job.snapshot),
    Option.flatMap((snapshot) => Option.fromNullishOr(snapshot.condition)),
    Option.getOrUndefined,
  );

const checkSections = (env: ExprEnv, job: Job): void => {
  checkConcurrency(env)(job.concurrency, "jobs.<job_id>.concurrency");
  checkEnv(env)(job.env, "jobs.<job_id>.env");
  checkDefaults(env)(job.defaults, "jobs.<job_id>.defaults.run");
  checkIf(env)(job.condition, "jobs.<job_id>.if");
};

export const checkJobPre =
  (scope: Scope) =>
  (job: Job): void => {
    const { env } = scope;
    checkString(env)(job.name, "jobs.<job_id>.name");
    checkStrings(env)(job.needs, "");
    checkRunsOn(env, job);
    checkSections(env, job);
    checkRuntime(env, job);
    checkCall(env)(scope.project)(job.workflowCall);
    checkIf(env)(snapshotIf(job), "jobs.<job_id>.snapshot.if");
  };

export const checkJobPost =
  (env: ExprEnv) =>
  (job: Job): void => {
    for (const environment of Option.toArray(Option.fromNullishOr(job.environment))) {
      checkString(env)(environment.name, "jobs.<job_id>.environment");
      checkString(env)(environment.url, "jobs.<job_id>.environment.url");
      checkBool(env)(environment.deployment, "jobs.<job_id>.environment");
    }
    for (const output of Rec.values(job.outputs)) {
      checkString(env)(output, "jobs.<job_id>.outputs.<output_id>");
    }
  };
