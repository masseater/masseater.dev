import type { Position, YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Predicate, Record as Rec } from "effect";

import type {
  CallEventInput,
  CallEventOutput,
  CallEventSecret,
  CallInputType,
  WorkflowCallEvent,
} from "#/entities/workflow/model/types.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { foldEntries, rejecting, setters } from "./fold.ts";
import type { Handler } from "./fold.ts";
import { entryRecord, parseMapping, parseSection } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { checkString, parseBool, parseString } from "./scalar.ts";
import type { Sink } from "./sink.ts";

const CALL_TYPES: Readonly<Record<string, CallInputType>> = {
  boolean: "boolean",
  number: "number",
  string: "string",
};

interface InputState {
  readonly input: CallEventInput;
  readonly typed: boolean;
}

const inputType =
  (sink: Sink): Handler<InputState> =>
  (state, entry) => {
    const node = entry.value;
    if (!checkString(sink)(node, false)) {
      return { ...state, typed: true };
    }
    return Option.match(Rec.get(CALL_TYPES, node.value), {
      onSome: (kind): InputState => ({ input: { ...state.input, kind }, typed: true }),
      onNone: (): InputState => {
        sink.error(
          node,
          `invalid value ${quote(node.value)} for input type of workflow_call event. it must be one of "boolean", "number", or "string"`,
        );
        return { ...state, typed: true };
      },
    });
  };

const lift =
  (handler: Handler<CallEventInput>): Handler<InputState> =>
  (state, entry) => ({ ...state, input: handler(state.input, entry) });

const anyString =
  (sink: Sink) =>
  (entry: Entry): Text =>
    parseString(sink)(entry.value, true);

const required =
  (sink: Sink) =>
  (entry: Entry): ReturnType<ReturnType<typeof parseBool>> =>
    parseBool(sink)(entry.value);

const mappingOf =
  (sink: Sink, place: string) =>
  (entry: Entry): readonly Entry[] =>
    parseMapping(sink)({ place, node: entry.value, allowEmpty: true, caseSensitive: true });

const callInput =
  (sink: Sink) =>
  (entry: Entry): CallEventInput => {
    const { set, setSome } = setters<CallEventInput>();
    const description = lift(set("description", anyString(sink)));
    const isRequired = lift(setSome("required", required(sink)));
    const fallback = lift(set("default", anyString(sink)));
    const state = foldEntries<InputState>({
      entries: mappingOf(sink, "input of workflow_call event")(entry),
      initial: { input: { id: entry.id, name: entry.key, kind: "invalid" }, typed: false },
      handlers: [
        ["description", description],
        ["required", isRequired],
        ["default", fallback],
        ["type", inputType(sink)],
      ],
      unknown: rejecting({
        sink,
        section: "inputs at workflow_call event",
        expected: ["description", "required", "default", "type"],
      }),
    });
    if (!state.typed) {
      sink.error(
        entry.key,
        `"type" is missing at ${quote(entry.key.value)} input of workflow_call event`,
      );
    }
    return state.input;
  };

const callSecret =
  (sink: Sink) =>
  (entry: Entry): CallEventSecret => {
    const { set, setSome } = setters<CallEventSecret>();
    return foldEntries<CallEventSecret>({
      entries: mappingOf(sink, "secret of workflow_call event")(entry),
      initial: { name: entry.key },
      handlers: [
        ["description", set("description", anyString(sink))],
        ["required", setSome("required", required(sink))],
      ],
      unknown: rejecting({ sink, section: "secrets", expected: ["description", "required"] }),
    });
  };

const callOutput =
  (sink: Sink) =>
  (entry: Entry): CallEventOutput => {
    const { set } = setters<CallEventOutput>();
    const output = foldEntries<CallEventOutput>({
      entries: mappingOf(sink, "output of workflow_call event")(entry),
      initial: { name: entry.key },
      handlers: [
        ["description", set("description", anyString(sink))],
        ["value", set("value", (item) => parseString(sink)(item.value, false))],
      ],
      unknown: rejecting({
        sink,
        section: "outputs at workflow_call event",
        expected: ["description", "value"],
      }),
    });
    if (Predicate.isUndefined(output.value)) {
      sink.error(
        entry.key,
        `"value" is missing at ${quote(entry.key.value)} output of workflow_call event`,
      );
    }
    return output;
  };

const section =
  (sink: Sink, name: string) =>
  (entry: Entry): readonly Entry[] =>
    parseSection(sink)({
      section: name,
      node: entry.value,
      allowEmpty: true,
      caseSensitive: false,
    });

export const emptyCall = (at: Position): WorkflowCallEvent => ({
  type: "workflow_call",
  inputs: [],
  outputs: {},
  line: at.line,
  column: at.column,
});

export const parseWorkflowCall =
  (sink: Sink) =>
  (at: Position, node: YamlNode): WorkflowCallEvent => {
    const { set } = setters<WorkflowCallEvent>();
    return foldEntries<WorkflowCallEvent>({
      entries: parseSection(sink)({
        section: "workflow_call",
        node,
        allowEmpty: true,
        caseSensitive: true,
      }),
      initial: emptyCall(at),
      handlers: [
        [
          "inputs",
          set("inputs", (entry) => Arr.map(section(sink, "inputs")(entry), callInput(sink))),
        ],
        [
          "secrets",
          set("secrets", (entry) => entryRecord(callSecret(sink))(section(sink, "secrets")(entry))),
        ],
        [
          "outputs",
          set("outputs", (entry) => entryRecord(callOutput(sink))(section(sink, "outputs")(entry))),
        ],
      ],
      unknown: rejecting({
        sink,
        section: "workflow_call",
        expected: ["inputs", "secrets", "outputs"],
      }),
    });
  };
