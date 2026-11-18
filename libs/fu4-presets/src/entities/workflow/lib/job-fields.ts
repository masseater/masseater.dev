import type { Job, WorkflowCall } from "#/entities/workflow/model/job-types.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import type { Handler } from "./fold.ts";
import type { Entry } from "./mapping.ts";
import { parseCallValues } from "./runner.ts";
import { parseString } from "./scalar.ts";
import { parseStringSequence } from "./sequence.ts";
import type { Sink } from "./sink.ts";

export interface JobState {
  readonly job: Job;
  readonly call: WorkflowCall;
  readonly stepsOnly?: Text;
  readonly callOnly?: Text;
}

export const forJob =
  (handler: Handler<Job>): Handler<JobState> =>
  (state, entry) => ({ ...state, job: handler(state.job, entry) });

export const stepsOnly =
  (handler: Handler<Job>): Handler<JobState> =>
  (state, entry) => ({ ...forJob(handler)(state, entry), stepsOnly: entry.key });

export const callOnly =
  (handler: Handler<WorkflowCall>): Handler<JobState> =>
  (state, entry) => ({ ...state, call: handler(state.call, entry), callOnly: entry.key });

export const needs =
  (sink: Sink) =>
  (entry: Entry): readonly Text[] => {
    if (entry.value.kind === "scalar") {
      return [parseString(sink)(entry.value, false)];
    }
    return parseStringSequence(sink)({
      section: "needs",
      node: entry.value,
      allowEmpty: false,
      allowElementEmpty: false,
    });
  };

export const callSecrets =
  (sink: Sink): Handler<WorkflowCall> =>
  (call, entry) => {
    const node = entry.value;
    if (node.kind !== "scalar") {
      return { ...call, secrets: parseCallValues(sink)("secrets", node) };
    }
    if (node.value === "inherit") {
      return { ...call, inheritSecrets: true };
    }
    sink.error(
      node,
      `expected mapping node for secrets or "inherit" string node but found ${quote(node.value)} node`,
    );
    return call;
  };

export const emptyJob = (id: Text): Job => ({
  id,
  needs: [],
  outputs: {},
  line: id.line,
  column: id.column,
});
