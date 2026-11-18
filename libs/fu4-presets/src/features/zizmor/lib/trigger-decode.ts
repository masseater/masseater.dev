import { Array as Arr, Option, Result, pipe } from "effect";

import type {
  DispatchInputType,
  EventBody,
  Trigger,
  WorkflowCallEvent,
  WorkflowDispatchEvent,
} from "#/features/zizmor/model/workflow.ts";
import { isNull } from "#/shared/yaml/index.ts";

import { envValue } from "./common.ts";
import {
  boolean,
  defaulted,
  literal,
  map,
  nodeAt,
  optional,
  record,
  required,
  sequence,
  string,
  struct,
  untagged,
  unit,
} from "./decode.ts";
import type { Decoder, Fields } from "./decode.ts";
import { noStrings, strings } from "./workflow-shared.ts";

const BARE_EVENTS = [
  "branch_protection_rule",
  "check_run",
  "check_suite",
  "create",
  "delete",
  "deployment",
  "deployment_status",
  "discussion",
  "discussion_comment",
  "fork",
  "gollum",
  "image_version",
  "issue_comment",
  "issues",
  "label",
  "merge_group",
  "milestone",
  "page_build",
  "project",
  "project_card",
  "project_column",
  "public",
  "pull_request",
  "pull_request_review",
  "pull_request_review_comment",
  "pull_request_target",
  "push",
  "registry_package",
  "release",
  "repository_dispatch",
  "status",
  "watch",
  "workflow_call",
  "workflow_dispatch",
  "workflow_run",
] as const;
const EVENTS = new Set<string>([...BARE_EVENTS, "schedule"]);

const typesOf: Decoder<readonly string[]> = struct((fields) =>
  defaulted("types")(strings)(noStrings)(fields),
);

const genericBody: Decoder<readonly string[]> = typesOf;

const sequenceString = sequence(string);

const imageVersion: Decoder<readonly string[]> = struct((fields) =>
  Result.map(
    Result.all([
      required("names")(sequenceString)(fields),
      required("versions")(sequenceString)(fields),
    ]),
    noStrings,
  ),
);

const workflowRun: Decoder<readonly string[]> = struct((fields) =>
  Result.flatMap(required("workflows")(sequence(string))(fields), () => typesOf(fields.node)),
);

const cron: Decoder<readonly string[]> = map(
  sequence(
    struct((fields) =>
      Result.all([required("cron")(string)(fields), optional("timezone")(string)(fields)]),
    ),
  ),
)(noStrings);

const described = (
  fields: Fields,
): Result.Result<readonly [Option.Option<string>, boolean], string> =>
  Result.all([
    optional("description")(string)(fields),
    defaulted("required")(boolean)(() => false)(fields),
  ]);

const callInput = struct((fields) =>
  Result.gen(function* decode() {
    yield* described(fields);
    const type = yield* required("type")(literal(["boolean", "number", "string"]))(fields);
    return type;
  }),
);

const callOutput = struct((fields) =>
  Result.gen(function* decode() {
    yield* optional("description")(string)(fields);
    const value = yield* required("value")(string)(fields);
    return value;
  }),
);

const callSecret = struct(described);

export const nullAsTrue = map(unit)(() => true);

const secretAsTrue = map(callSecret)(() => true);

const callSecrets = record(untagged<boolean>(nullAsTrue, secretAsTrue));

const callInputs = record(callInput);

const callOutputs = record(callOutput);

const emptyMap = <Key, Value>(): ReadonlyMap<Key, Value> => new Map();

const workflowCall: Decoder<WorkflowCallEvent> = struct((fields) =>
  Result.gen(function* decode() {
    const inputs = yield* defaulted("inputs")(callInputs)(emptyMap)(fields);
    const outputs = yield* defaulted("outputs")(callOutputs)(emptyMap)(fields);
    const secrets = yield* defaulted("secrets")(callSecrets)(emptyMap)(fields);
    return { inputs, outputs, secrets: [...secrets.keys()] };
  }),
);

const dispatchInput = struct((fields) =>
  Result.gen(function* decode() {
    yield* described(fields);
    const type = yield* defaulted("type")(
      literal(["boolean", "choice", "environment", "number", "string"]),
    )((): DispatchInputType => "string")(fields);
    yield* defaulted("options")(sequence(envValue))(() => [])(fields);
    return type;
  }),
);

const workflowDispatch: Decoder<WorkflowDispatchEvent> = struct((fields) =>
  Result.map(defaulted("inputs")(record(dispatchInput))(() => new Map())(fields), (inputs) => ({
    inputs,
  })),
);

const BODIES: Readonly<Record<string, Decoder<readonly string[]>>> = {
  image_version: imageVersion,
  workflow_run: workflowRun,
  schedule: cron,
  workflow_call: map(workflowCall)(noStrings),
  workflow_dispatch: map(workflowDispatch)(noStrings),
};

const eventBody =
  (name: string): Decoder<EventBody> =>
  (node) => {
    if (isNull(node)) {
      return Result.succeed({ type: "default" });
    }
    const decoder = Option.getOrElse(Option.fromNullishOr(BODIES[name]), () => genericBody);
    return Result.map(decoder(node), (types) => ({ type: "body", node, types }));
  };

const namedBody =
  (fields: Fields) =>
  (name: string): Result.Result<readonly [string, EventBody], string> =>
    pipe(
      Result.fromOption(nodeAt(fields)(name), () => `missing field \`${name}\``),
      Result.flatMap(eventBody(name)),
      Result.map((body) => [name, body] as const),
    );

const eventsOf = (
  fields: Fields,
): Result.Result<readonly (readonly [string, EventBody])[], string> =>
  pipe(
    Arr.fromIterable(fields.entries.keys()),
    Arr.filter((name) => EVENTS.has(name)),
    Arr.map(namedBody(fields)),
    Result.all,
  );

const mappingTrigger: Decoder<Trigger> = struct((fields) =>
  pipe(
    eventsOf(fields),
    Result.flatMap((events) =>
      Result.gen(function* decode() {
        const call = yield* optional("workflow_call")(workflowCall)(fields);
        const dispatch = yield* optional("workflow_dispatch")(workflowDispatch)(fields);
        return {
          events: new Map(events),
          syntax: { type: "mapping" },
          workflowCall: call,
          workflowDispatch: dispatch,
        };
      }),
    ),
  ),
);

const bareEvent = literal(BARE_EVENTS);

const bareTrigger = (names: readonly string[], syntax: Trigger["syntax"]): Trigger => ({
  events: new Map(
    pipe(
      names,
      Arr.map((name) => [name, { type: "default" } as const]),
    ),
  ),
  syntax,
  workflowCall: Option.none(),
  workflowDispatch: Option.none(),
});

const defaultCall = (
  names: readonly string[],
): Pick<Trigger, "workflowCall" | "workflowDispatch"> => ({
  workflowCall: Option.liftPredicate({ inputs: new Map(), outputs: new Map(), secrets: [] }, () =>
    names.includes("workflow_call"),
  ),
  workflowDispatch: Option.liftPredicate({ inputs: new Map() }, () =>
    names.includes("workflow_dispatch"),
  ),
});

export const trigger: Decoder<Trigger> = untagged<Trigger>(
  mappingTrigger,
  map(bareEvent)((name) => ({
    ...bareTrigger([name], { type: "scalar" }),
    ...defaultCall([name]),
  })),
  map(sequence(bareEvent))((names) => ({
    ...bareTrigger(names, { type: "sequence", events: names }),
    ...defaultCall(names),
  })),
);
