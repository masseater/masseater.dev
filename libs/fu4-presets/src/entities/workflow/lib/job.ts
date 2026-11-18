import type { YamlNode } from "@r_masseater/fu4";
import { Predicate } from "effect";

import type { Job } from "#/entities/workflow/model/job-types.ts";
import { quote } from "#/shared/text/index.ts";

import { foldEntries, rejecting } from "./fold.ts";
import { emptyJob } from "./job-fields.ts";
import type { JobState } from "./job-fields.ts";
import { generalHandlers } from "./job-general.ts";
import { stepHandlers } from "./job-steps.ts";
import { parseMapping } from "./mapping.ts";
import type { Sink } from "./sink.ts";

const JOB_KEYS = [
  "name",
  "needs",
  "runs-on",
  "permissions",
  "environment",
  "concurrency",
  "outputs",
  "env",
  "defaults",
  "if",
  "steps",
  "timeout-minutes",
  "strategy",
  "continue-on-error",
  "container",
  "services",
  "uses",
  "with",
  "secrets",
  "snapshot",
];

const finishCall =
  (sink: Sink) =>
  (state: JobState): Job => {
    const key = state.stepsOnly;
    if (Predicate.isUndefined(key)) {
      return { ...state.job, workflowCall: state.call };
    }
    sink.error(
      key,
      `when a reusable workflow is called with "uses", ${quote(key.value)} is not available. only following keys are allowed: "name", "uses", "with", "secrets", "needs", "if", and "permissions" in job ${quote(state.job.id.value)}`,
    );
    return state.job;
  };

const finishSteps =
  (sink: Sink) =>
  (state: JobState): Job => {
    const { job, callOnly: key } = state;
    const id = quote(job.id.value);
    if (Predicate.isUndefined(job.steps)) {
      sink.error(job.id, `"steps" section is missing in job ${id}`);
    }
    if (Predicate.isUndefined(job.runsOn)) {
      sink.error(job.id, `"runs-on" section is missing in job ${id}`);
    }
    if (Predicate.isNotUndefined(key)) {
      sink.error(
        key,
        `${quote(key.value)} is only available for a reusable workflow call with "uses" but "uses" is not found in job ${id}`,
      );
    }
    return job;
  };

export const parseJob =
  (sink: Sink) =>
  (id: Job["id"], node: YamlNode): Job => {
    const state = foldEntries<JobState>({
      entries: parseMapping(sink)({
        place: `${quote(id.value)} job`,
        node,
        allowEmpty: false,
        caseSensitive: true,
      }),
      initial: { job: emptyJob(id), call: { inputs: {}, secrets: {}, inheritSecrets: false } },
      handlers: [...generalHandlers(sink), ...stepHandlers(sink)],
      unknown: rejecting({ sink, section: "job", expected: JOB_KEYS }),
    });
    if (Predicate.isUndefined(state.call.uses)) {
      return finishSteps(sink)(state);
    }
    return finishCall(sink)(state);
  };
