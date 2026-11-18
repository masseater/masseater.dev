import { Array as Arr, Option, pipe } from "effect";

import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/zizmor/lib/finding.ts";
import { annotated, primary } from "#/features/zizmor/lib/location.ts";
import { stepView, stepsOf } from "#/features/zizmor/lib/workflow-steps.ts";
import {
  effectiveCacheMode,
  jobLocationWithGrip,
  triggerAt,
} from "#/features/zizmor/lib/workflow.ts";
import type { Audit, Drafts } from "#/features/zizmor/model/audit.ts";
import type { SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { NormalJob, ReusableJob } from "#/features/zizmor/model/input.ts";

import { cacheAware, meta } from "./cache-poisoning-locations.ts";
import { scenarioOf } from "./cache-poisoning-scenario.ts";

const DANGEROUS = ["pull_request_target", "workflow_run", "issue_comment"] as const;

const writesCache = (job: NormalJob | ReusableJob): Option.Option<SymbolicLocation> => {
  const cache = effectiveCacheMode(job);
  if (cache.mode !== "write" && cache.mode !== "write-only") {
    return Option.none();
  }
  return cache.location;
};

const dangerousWrite = (job: NormalJob | ReusableJob): Drafts => {
  const trigger = pipe(
    DANGEROUS,
    Arr.findFirst((event) => triggerAt(event)(job.workflow)),
  );
  const cache = writesCache(job);
  if (Option.isNone(trigger) || Option.isNone(cache)) {
    return [];
  }
  const jobAt = annotated("this job can write to the cache")(jobLocationWithGrip(job));
  return [
    pipe(
      finding(meta),
      confidence("high"),
      severity("high"),
      persona("regular"),
      at(jobAt),
      at(annotated("trigger provides elevated access to external actors")(trigger.value)),
      atPath(cache.value, primary, annotated("cache writes enabled here")),
    ),
  ];
};

const scenarioFindings = (job: NormalJob): Drafts => {
  const steps = pipe(stepsOf(job), Arr.map(stepView));
  return Option.match(scenarioOf(job)(steps), {
    onNone: () => [],
    onSome: (scenario) =>
      pipe(
        steps,
        Arr.flatMap((step) => cacheAware(job.workflow)(scenario)(step)),
      ),
  });
};

export const cachePoisoning: Audit = {
  ...meta,
  normalJob: (job) => {
    const dangerous = dangerousWrite(job);
    if (effectiveCacheMode(job).mode === "none") {
      return dangerous;
    }
    return [...dangerous, ...scenarioFindings(job)];
  },
  reusableJob: dangerousWrite,
};
