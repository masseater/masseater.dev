import type { Job } from "#/entities/workflow/model/job-types.ts";

import { parseContainer } from "./container.ts";
import { setters } from "./fold.ts";
import type { Handlers } from "./fold.ts";
import { stepsOnly } from "./job-fields.ts";
import type { JobState } from "./job-fields.ts";
import { parseRunsOn } from "./runner.ts";
import { parseBool, parseTimeoutMinutes } from "./scalar.ts";
import { parseDefaults, parseEnv, parseEnvironment, parseOutputs } from "./sections.ts";
import type { Sink } from "./sink.ts";
import { parseSteps } from "./steps.ts";

export const stepHandlers = (sink: Sink): Handlers<JobState> => {
  const { set, setSome } = setters<Job>();
  return [
    ["runs-on", stepsOnly(set("runsOn", (entry) => parseRunsOn(sink)(entry.value)))],
    [
      "environment",
      stepsOnly(set("environment", (entry) => parseEnvironment(sink)(entry.key, entry.value))),
    ],
    ["outputs", stepsOnly(set("outputs", (entry) => parseOutputs(sink)(entry.value)))],
    ["env", stepsOnly(set("env", (entry) => parseEnv(sink)(entry.value)))],
    ["defaults", stepsOnly(set("defaults", (entry) => parseDefaults(sink)(entry.value)))],
    ["steps", stepsOnly(setSome("steps", (entry) => parseSteps(sink)(entry.value)))],
    [
      "timeout-minutes",
      stepsOnly(setSome("timeoutMinutes", (entry) => parseTimeoutMinutes(sink)(entry.value))),
    ],
    [
      "continue-on-error",
      stepsOnly(setSome("continueOnError", (entry) => parseBool(sink)(entry.value))),
    ],
    [
      "container",
      stepsOnly(
        set("container", (entry) => parseContainer(sink)("container", entry.key, entry.value)),
      ),
    ],
  ];
};
