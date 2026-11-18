import { Option, Predicate, Record as Rec, pipe } from "effect";

import { containsExpression } from "#/entities/workflow/index.ts";
import type { Container, Env } from "#/entities/workflow/model/job-types.ts";
import { NOOP, workflowRule } from "#/features/actionlint/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/actionlint/lib/workflow-rule.ts";
import { servicesOf } from "#/features/actionlint/rules/credentials.ts";
import { quote } from "#/shared/text/index.ts";

const INVALID = /[\t &=]/u;

const checkEnv =
  (fail: Fail) =>
  (env: Env | undefined): void => {
    const literal = pipe(
      Option.fromNullishOr(env),
      Option.filter((found) => Predicate.isUndefined(found.expression)),
    );
    for (const found of Option.toArray(literal)) {
      for (const { name } of Rec.values(found.vars)) {
        if (!containsExpression(name.value) && INVALID.test(name.value)) {
          fail(
            name,
            `environment variable name ${quote(name.value)} is invalid. '&', '=' and spaces should not be contained`,
          );
        }
      }
    }
  };

const checkContainer =
  (fail: Fail) =>
  (container: Container | undefined): void => {
    for (const found of Option.toArray(Option.fromNullishOr(container))) {
      checkEnv(fail)(found.env);
    }
  };

export const envVar = workflowRule({
  description: "Reports environment variable names containing '&', '=' or spaces",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-env-var-names",
  visitor: (fail): Visitor => ({
    ...NOOP,
    workflowPre: (workflow) => {
      checkEnv(fail)(workflow.env);
    },
    jobPre: (job) => {
      checkEnv(fail)(job.env);
      checkContainer(fail)(job.container);
      for (const service of servicesOf(job)) {
        checkContainer(fail)(service.container);
      }
    },
    step: (step) => {
      checkEnv(fail)(step.env);
    },
  }),
});
