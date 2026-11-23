import type { Position } from "@r_masseater/fu4";
import { Option, String as Str } from "effect";

import { containsExpression } from "#/entities/workflow/index.ts";
import { NOOP, workflowRule } from "#/features/check-workflows/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";
import { describePosition } from "#/shared/yaml/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const ID = /^[A-Z_a-z][\w-]*$/u;

const validate =
  (fail: Fail) =>
  (id: Text, what: string): void => {
    if (Str.isEmpty(id.value) || containsExpression(id.value) || ID.test(id.value)) {
      return;
    }
    fail(
      id,
      `invalid ${what} ID ${quote(id.value)}. ${what} ID must start with a letter or _ and contain only alphanumeric characters, -, or _`,
    );
  };

export const id = workflowRule({
  description: "Reports invalid job and step IDs and step IDs duplicated within a job",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#id-naming-convention",
  visitor: (fail): Visitor => {
    const seen = new Map<string, Position>();
    return {
      ...NOOP,
      jobPre: (job) => {
        seen.clear();
        validate(fail)(job.id, "job");
        for (const need of job.needs) {
          validate(fail)(need, "job");
        }
      },
      step: (step) => {
        for (const stepId of Option.toArray(Option.fromNullishOr(step.id))) {
          validate(fail)(stepId, "step");
          const key = Str.toLowerCase(stepId.value);
          const previous = Option.fromNullishOr(seen.get(key));
          if (Option.isNone(previous)) {
            seen.set(key, stepId);
          } else {
            fail(
              stepId,
              `step ID ${quote(stepId.value)} duplicates. previously defined at ${describePosition(previous.value)}. step ID must be unique within a job. note that step ID is case insensitive`,
            );
          }
        }
      },
    };
  },
});
