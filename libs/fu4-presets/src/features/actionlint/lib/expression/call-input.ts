import { Array as Arr, Option, Record as Rec } from "effect";

import { ANY, BOOL, NUMBER, STRING, assignable, describe } from "#/entities/expression/index.ts";
import type { ExprType } from "#/entities/expression/index.ts";
import { isExpressionAssigned } from "#/entities/workflow/index.ts";
import type { CallValue, WorkflowCall } from "#/entities/workflow/model/job-types.ts";
import type { CallInput, CallInputKind } from "#/entities/workflow/model/reusable.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import type { ExprEnv, Typed } from "./env.ts";
import { literalType } from "./matrix-type.ts";
import { checkString } from "./strings.ts";

const SINGLE = 1;

export const CALL_TYPES: Readonly<Record<CallInputKind, ExprType>> = {
  any: ANY,
  boolean: BOOL,
  number: NUMBER,
  string: STRING,
};

const givenType = (typed: readonly Typed[], value: Text): ExprType => {
  if (Arr.isReadonlyArrayEmpty(typed)) {
    return literalType(value.value);
  }
  const one = Arr.head(typed);
  if (typed.length === SINGLE && isExpressionAssigned(value.value) && Option.isSome(one)) {
    return one.value.type;
  }
  return STRING;
};

export interface Call {
  readonly env: ExprEnv;
  readonly uses: Text;
  readonly declared: Readonly<Record<string, CallInput>>;
}

const checkInput =
  ({ env, uses }: Call, spec: CallInput) =>
  (input: CallValue, typed: readonly Typed[]): void => {
    const expected = CALL_TYPES[spec.kind];
    const given = givenType(typed, input.value);
    if (spec.kind !== "any" && !assignable(expected)(given)) {
      env.fail(
        input.value,
        `input ${quote(spec.name)} is typed as ${describe(expected)} by reusable workflow ${quote(uses.value)}. ${describe(given)} value cannot be assigned`,
      );
    }
  };

export const checkCallInputs =
  (call: Call) =>
  (found: WorkflowCall): void => {
    for (const [id, input] of Rec.toEntries(found.inputs)) {
      const typed = checkString(call.env)(input.value, "jobs.<job_id>.with.<input_id>");
      for (const spec of Option.toArray(Rec.get(call.declared, id))) {
        checkInput(call, spec)(input, typed);
      }
    }
  };
