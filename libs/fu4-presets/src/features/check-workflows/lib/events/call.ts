import { Option, Predicate } from "effect";

import { containsExpression } from "#/entities/workflow/index.ts";
import type { CallEventInput, WorkflowCallEvent } from "#/entities/workflow/index.ts";
import type { Fail } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { floatError, isBoolean } from "./defaults.ts";

const checkType = (fail: Fail, input: CallEventInput, value: Text): void => {
  const name = quote(input.name.value);
  if (input.kind === "number") {
    for (const error of Option.toArray(floatError(value.value))) {
      fail(
        value,
        `input of workflow_call event ${name} is typed as number but its default value ${quote(value.value)} cannot be parsed as a float number: ${error}`,
      );
    }
  }
  if (input.kind === "boolean" && !isBoolean(value.value)) {
    fail(
      value,
      `input of workflow_call event ${name} is typed as boolean. its default value must be true or false but got ${quote(value.value)}`,
    );
  }
};

const isRequired = (input: CallEventInput): boolean =>
  !Predicate.isUndefined(input.required) && input.required.value;

const checkInput = (fail: Fail, input: CallEventInput, value: Text): void => {
  if (!containsExpression(value.value)) {
    checkType(fail, input, value);
  }
  if (isRequired(input)) {
    fail(
      value,
      `input ${quote(input.name.value)} of workflow_call event has the default value ${quote(value.value)}, but it is also required. if an input is marked as required, its default value will never be used`,
    );
  }
};

export const checkCallDefaults =
  (fail: Fail) =>
  (event: WorkflowCallEvent): void => {
    for (const input of event.inputs) {
      for (const value of Option.toArray(Option.fromNullishOr(input.default))) {
        checkInput(fail, input, value);
      }
    }
  };
