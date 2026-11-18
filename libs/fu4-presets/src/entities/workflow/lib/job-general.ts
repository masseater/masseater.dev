import type { Job, WorkflowCall } from "#/entities/workflow/model/job-types.ts";

import { parseServices } from "./container.ts";
import { setters } from "./fold.ts";
import type { Handlers } from "./fold.ts";
import { callOnly, callSecrets, forJob, needs } from "./job-fields.ts";
import type { JobState } from "./job-fields.ts";
import { parseCallValues, parseSnapshot } from "./runner.ts";
import { parseString } from "./scalar.ts";
import { parseConcurrency, parsePermissions } from "./sections.ts";
import type { Sink } from "./sink.ts";
import { parseStrategy } from "./strategy.ts";

export const generalHandlers = (sink: Sink): Handlers<JobState> => {
  const { set, setSome } = setters<Job>();
  const call = setters<WorkflowCall>();
  return [
    ["name", forJob(set("name", (entry) => parseString(sink)(entry.value, true)))],
    ["needs", forJob(set("needs", needs(sink)))],
    ["permissions", forJob(set("permissions", (entry) => parsePermissions(sink)(entry.value)))],
    [
      "concurrency",
      forJob(set("concurrency", (entry) => parseConcurrency(sink)(entry.key, entry.value))),
    ],
    ["if", forJob(set("condition", (entry) => parseString(sink)(entry.value, false)))],
    ["strategy", forJob(set("strategy", (entry) => parseStrategy(sink)(entry.value)))],
    ["services", forJob(set("services", (entry) => parseServices(sink)(entry.value)))],
    [
      "snapshot",
      forJob(setSome("snapshot", (entry) => parseSnapshot(sink)(entry.key, entry.value))),
    ],
    ["uses", callOnly(call.set("uses", (entry) => parseString(sink)(entry.value, false)))],
    ["with", callOnly(call.set("inputs", (entry) => parseCallValues(sink)("with", entry.value)))],
    ["secrets", callOnly(callSecrets(sink))],
  ];
};
