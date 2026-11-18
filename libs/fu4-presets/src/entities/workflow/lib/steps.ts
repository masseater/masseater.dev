import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Exec, Step } from "#/entities/workflow/model/job-types.ts";

import { execAction, execRun } from "./exec.ts";
import { foldEntries, keep, setters } from "./fold.ts";
import type { Handler, Handlers } from "./fold.ts";
import { parseMapping } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import { parseBool, parseString, parseTimeoutMinutes } from "./scalar.ts";
import { parseEnv } from "./sections.ts";
import { checkSequence } from "./sequence.ts";
import type { Sink } from "./sink.ts";

type Shape = "unknown" | "action" | "docker" | "run";

interface StepState {
  readonly step: Step;
  readonly shape: Shape;
}

const lift =
  (handler: Handler<Step>): Handler<StepState> =>
  (state, entry) => ({ ...state, step: handler(state.step, entry) });

const usesShape: Handler<StepState> = (state, entry) => {
  if (Str.startsWith("docker://")(entry.value.value)) {
    return { ...state, shape: "docker" };
  }
  return { ...state, shape: "action" };
};

const runShape: Handler<StepState> = (state) => ({ ...state, shape: "run" });

const stepHandlers = (sink: Sink): Handlers<StepState> => {
  const { set, setSome } = setters<Step>();
  const text =
    (allowEmpty: boolean) =>
    (entry: Entry): NonNullable<Step["name"]> =>
      parseString(sink)(entry.value, allowEmpty);
  return [
    ["id", lift(set("id", text(false)))],
    ["if", lift(set("condition", text(false)))],
    ["name", lift(set("name", text(true)))],
    ["env", lift(set("env", (entry) => parseEnv(sink)(entry.value)))],
    [
      "continue-on-error",
      lift(setSome("continueOnError", (entry) => parseBool(sink)(entry.value))),
    ],
    [
      "timeout-minutes",
      lift(setSome("timeoutMinutes", (entry) => parseTimeoutMinutes(sink)(entry.value))),
    ],
    ["uses", usesShape],
    ["run", runShape],
  ];
};

const execOf =
  (sink: Sink) =>
  (shape: Shape, entries: readonly Entry[]): Option.Option<Exec> => {
    if (shape === "run") {
      return Option.some(execRun(sink)(entries));
    }
    if (shape === "unknown") {
      return Option.none();
    }
    return Option.some(execAction(sink)(entries, shape === "docker"));
  };

const parseStep =
  (sink: Sink) =>
  (node: YamlNode): Step => {
    const entries = parseMapping(sink)({
      place: 'element of "steps" section',
      node,
      allowEmpty: false,
      caseSensitive: true,
    });
    const state = foldEntries<StepState>({
      entries,
      initial: { step: {}, shape: "unknown" },
      handlers: stepHandlers(sink),
      unknown: keep,
    });
    if (state.shape === "unknown") {
      sink.error(node, 'step must run script with "run" section or run action with "uses" section');
    }
    return Option.match(execOf(sink)(state.shape, entries), {
      onNone: () => state.step,
      onSome: (exec): Step => ({ ...state.step, exec }),
    });
  };

export const parseSteps =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<readonly Step[]> => {
    if (!checkSequence(sink)({ section: "steps", node, allowEmpty: false })) {
      return Option.none();
    }
    return Option.some(
      pipe(
        node.children,
        Arr.map((child) => parseStep(sink)(child)),
      ),
    );
  };
