import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { ANY, BOOL, NUMBER, STRING, describe, strict } from "#/entities/expression/index.ts";
import type { ExprType, ObjectType } from "#/entities/expression/index.ts";
import { isExpressionAssigned } from "#/entities/workflow/index.ts";
import type {
  CallEventInput,
  DispatchInputType,
  Event,
  EventFilter,
  WorkflowCallEvent,
  WebhookEvent,
  WorkflowDispatchEvent,
} from "#/entities/workflow/model/types.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { CALL_TYPES } from "./call-input.ts";
import type { ExprEnv } from "./env.ts";
import { checkBool, checkString, checkStrings } from "./strings.ts";
import type { Maybe } from "./strings.ts";

const SINGLE = 1;

const DISPATCH_TYPES: Readonly<Record<DispatchInputType, ExprType>> = {
  boolean: BOOL,
  number: NUMBER,
  string: STRING,
  choice: STRING,
  environment: STRING,
  none: ANY,
};

const EXPECTED: Readonly<Record<string, string>> = { boolean: "bool", number: "number" };

export interface EventVars {
  readonly inputs: Option.Option<ObjectType>;
  readonly dispatchInputs: Option.Option<ObjectType>;
  readonly secrets: Option.Option<ObjectType>;
}

const NO_VARS: EventVars = {
  inputs: Option.none(),
  dispatchInputs: Option.none(),
  secrets: Option.none(),
};

export const withEventVars =
  (env: ExprEnv) =>
  (vars: EventVars): ExprEnv => ({
    ...env,
    vars: () => ({ ...env.vars(), ...vars }),
  });

const callType = (input: CallEventInput): ExprType => {
  if (input.kind === "invalid") {
    return ANY;
  }
  return CALL_TYPES[input.kind];
};

const checkCallDefault = (env: ExprEnv, input: CallEventInput): void => {
  const typed = checkString(env)(input.default, "on.workflow_call.inputs.<inputs_id>.default");
  const expected = Rec.get(EXPECTED, input.kind);
  const one = Option.filter(Arr.head(typed), () => typed.length === SINGLE);
  const defaulted = Option.filter(Option.fromNullishOr(input.default), (value) =>
    isExpressionAssigned(value.value),
  );
  for (const [name, found, value] of Option.toArray(Option.all([expected, one, defaulted]))) {
    if (found.type.kind !== "any" && found.type.kind !== callType(input).kind) {
      env.fail(
        value,
        `type of input ${quote(input.name.value)} must be ${name} but found type ${describe(found.type)}`,
      );
    }
  }
};

const checkCallInputs = (env: ExprEnv, call: WorkflowCallEvent, current: EventVars): ObjectType => {
  let inputs = strict();
  for (const input of call.inputs) {
    const scoped = withEventVars(env)({ ...current, inputs: Option.some(inputs) });
    checkString(scoped)(input.description, "");
    checkCallDefault(scoped, input);
    inputs = strict(Rec.set(inputs.props, input.id, callType(input)));
  }
  return inputs;
};

const checkCallEvent = (env: ExprEnv, call: WorkflowCallEvent, current: EventVars): EventVars => {
  const inputs = checkCallInputs(env, call, current);
  const after = withEventVars(env)({ ...current, inputs: Option.some(inputs) });
  const secrets = Option.map(Option.fromNullishOr(call.secrets), (declared) => {
    for (const secret of Rec.values(declared)) {
      checkString(after)(secret.description, "");
    }
    return strict(
      pipe(
        declared,
        Rec.map(() => STRING),
      ),
    );
  });
  for (const output of Rec.values(call.outputs)) {
    checkString(withEventVars(env)({ ...current, inputs: Option.some(inputs), secrets }))(
      output.description,
      "",
    );
  }
  return {
    ...current,
    inputs: Option.some(inputs),
    secrets: Option.orElse(secrets, () => current.secrets),
  };
};

const checkDispatchEvent = (
  env: ExprEnv,
  dispatch: WorkflowDispatchEvent,
  current: EventVars,
): EventVars => {
  for (const input of Rec.values(dispatch.inputs)) {
    checkString(env)(input.description, "");
    checkString(env)(input.default, "");
    checkBool(env)(input.required, "");
    checkStrings(env)(input.options, "");
  }
  const dispatchProps = pipe(
    dispatch.inputs,
    Rec.map((input) => DISPATCH_TYPES[input.kind]),
  );
  return {
    ...current,
    dispatchInputs: Option.some(strict(dispatchProps)),
  };
};

const valuesOf = (filter: Maybe<EventFilter>): readonly Text[] =>
  pipe(
    Option.fromNullishOr(filter),
    Option.map((found) => found.values),
    Option.getOrElse((): readonly Text[] => []),
  );

const webhookTexts = (event: WebhookEvent): readonly Maybe<Text>[] => [
  ...event.types,
  ...pipe(
    [
      event.branches,
      event.branchesIgnore,
      event.tags,
      event.tagsIgnore,
      event.paths,
      event.pathsIgnore,
    ],
    Arr.flatMap(valuesOf),
  ),
  ...event.workflows,
];

const textsOf = (event: Event): readonly Maybe<Text>[] => {
  if (event.type === "webhook") {
    return webhookTexts(event);
  }
  if (event.type === "schedule") {
    return pipe(
      event.schedules,
      Arr.flatMap((schedule) => [schedule.cron, schedule.timezone]),
    );
  }
  if (event.type === "repository_dispatch") {
    return event.types;
  }
  if (event.type === "image_version") {
    return [...event.names, ...event.versions];
  }
  return [];
};

const checkEvent = (env: ExprEnv, event: Event, current: EventVars): EventVars => {
  for (const text of textsOf(event)) {
    checkString(env)(text, "");
  }
  if (event.type === "workflow_dispatch") {
    return checkDispatchEvent(env, event, current);
  }
  if (event.type === "workflow_call") {
    return checkCallEvent(env, event, current);
  }
  return current;
};

export const checkEvents =
  (env: ExprEnv) =>
  (events: readonly Event[]): EventVars => {
    let vars = NO_VARS;
    for (const event of events) {
      vars = checkEvent(withEventVars(env)(vars), event, vars);
    }
    return vars;
  };
