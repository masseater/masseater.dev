import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { DispatchInput, WorkflowDispatchEvent } from "#/entities/workflow/model/types.ts";
import type { Fail } from "#/features/actionlint/lib/workflow-rule.ts";
import { quote, quotes } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { floatError, isBoolean } from "./defaults.ts";

const MAX_INPUTS = 25;

const checkDuplicates = (fail: Fail, name: string, input: DispatchInput): readonly string[] => {
  const seen: string[] = [];
  for (const option of input.options) {
    if (Arr.contains(seen, option.value)) {
      fail(
        option,
        `option ${quote(option.value)} is duplicated in options of ${quote(name)} input`,
      );
    } else {
      seen.push(option.value);
    }
  }
  return seen;
};

const checkChoice = (fail: Fail, name: string, input: DispatchInput): void => {
  if (Arr.isReadonlyArrayEmpty(input.options)) {
    fail(input.name, `input type of ${quote(name)} is "choice" but "options" is not set`);
    return;
  }
  const seen = checkDuplicates(fail, name, input);
  const missing = Option.filter(
    Option.fromNullishOr(input.default),
    (value) => !Arr.contains(seen, value.value),
  );
  for (const value of Option.toArray(missing)) {
    const listed = quotes(
      pipe(
        input.options,
        Arr.map((option) => option.value),
      ),
    );
    fail(
      value,
      `default value ${quote(value.value)} of ${quote(name)} input is not included in its options ${quote(listed)}`,
    );
  }
};

const checkDefault =
  (fail: Fail, name: string) =>
  (input: DispatchInput, value: Text): void => {
    if (input.kind === "number") {
      for (const error of Option.toArray(floatError(value.value))) {
        fail(
          value,
          `type of ${quote(input.name.value)} input is "number" but its default value ${quote(value.value)} cannot be parsed as a float number: ${error}`,
        );
      }
    }
    if (input.kind === "boolean" && !isBoolean(value.value)) {
      fail(
        value,
        `type of ${quote(name)} input is "boolean". its default value ${quote(value.value)} must be "true" or "false"`,
      );
    }
  };

const checkInput = (fail: Fail, name: string, input: DispatchInput): void => {
  if (input.kind === "choice") {
    checkChoice(fail, name, input);
    return;
  }
  if (Arr.isReadonlyArrayNonEmpty(input.options)) {
    fail(
      input.name,
      `"options" can not be set to ${quote(name)} input because its input type is not "choice"`,
    );
  }
  for (const value of Option.toArray(Option.fromNullishOr(input.default))) {
    checkDefault(fail, name)(input, value);
  }
};

export const checkDispatch =
  (fail: Fail) =>
  (event: WorkflowDispatchEvent): void => {
    for (const [name, input] of Rec.toEntries(event.inputs)) {
      checkInput(fail, name, input);
    }
    const count = Rec.size(event.inputs);
    if (count > MAX_INPUTS) {
      fail(
        event,
        `maximum number of inputs for "workflow_dispatch" event is 25 but ${String(count)} inputs are provided. see https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#providing-inputs`,
      );
    }
  };
