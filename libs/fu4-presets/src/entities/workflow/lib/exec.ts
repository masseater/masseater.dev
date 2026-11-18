import { Array as Arr, pipe } from "effect";

import type { ExecAction, ExecRun, Input } from "#/entities/workflow/model/job-types.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { foldEntries, keep, rejecting, setters } from "./fold.ts";
import type { Handler, Handlers } from "./fold.ts";
import { parseSection, sortedRecord } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { parseString } from "./scalar.ts";
import type { Sink } from "./sink.ts";

const COMMON = ["id", "if", "name", "env", "continue-on-error", "timeout-minutes"];

const common = <State>(): Handlers<State> =>
  pipe(
    COMMON,
    Arr.map((key): readonly [string, Handler<State>] => [key, keep]),
  );

const text =
  (sink: Sink, allowEmpty: boolean) =>
  (entry: Entry): Text =>
    parseString(sink)(entry.value, allowEmpty);

interface WithState {
  readonly action: ExecAction;
  readonly inputs: readonly (readonly [string, Input])[];
}

const withInput =
  (sink: Sink, docker: boolean): Handler<WithState> =>
  (state, item) => {
    if (docker && item.id === "entrypoint") {
      return { ...state, action: { ...state.action, entrypoint: text(sink, false)(item) } };
    }
    if (docker && item.id === "args") {
      return { ...state, action: { ...state.action, args: text(sink, true)(item) } };
    }
    const input: Input = { name: item.key, value: text(sink, true)(item) };
    return { ...state, inputs: [...state.inputs, [item.id, input]] };
  };

const parseWith =
  (sink: Sink, docker: boolean): Handler<ExecAction> =>
  (action, entry) => {
    const state = foldEntries<WithState>({
      entries: parseSection(sink)({
        section: "with",
        node: entry.value,
        allowEmpty: false,
        caseSensitive: false,
      }),
      initial: { action, inputs: [] },
      handlers: [],
      unknown: withInput(sink, docker),
    });
    return { ...state.action, inputs: sortedRecord(state.inputs) };
  };

export const execAction =
  (sink: Sink) =>
  (entries: readonly Entry[], docker: boolean): ExecAction =>
    foldEntries<ExecAction>({
      entries,
      initial: { type: "action" },
      handlers: [
        ...common<ExecAction>(),
        ["uses", setters<ExecAction>().set("uses", text(sink, false))],
        ["with", parseWith(sink, docker)],
      ],
      unknown: rejecting({
        sink,
        section: "step to execute action",
        expected: [...COMMON, "uses", "with"],
      }),
    });

const runHandler =
  (sink: Sink): Handler<ExecRun> =>
  (state, entry) => ({ ...state, run: text(sink, false)(entry), runPosition: entry.key });

export const execRun =
  (sink: Sink) =>
  (entries: readonly Entry[]): ExecRun => {
    const { set } = setters<ExecRun>();
    return foldEntries<ExecRun>({
      entries,
      initial: { type: "run" },
      handlers: [
        ...common<ExecRun>(),
        ["run", runHandler(sink)],
        ["shell", set("shell", text(sink, false))],
        ["working-directory", set("workingDirectory", text(sink, false))],
      ],
      unknown: rejecting({
        sink,
        section: "step to run shell command",
        expected: [...COMMON, "run", "shell", "working-directory"],
      }),
    });
  };
