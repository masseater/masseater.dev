import { Array as Arr, Option, pipe } from "effect";

import { at, confidence, finding, persona, severity } from "#/features/zizmor/lib/finding.ts";
import type { AuditMeta } from "#/features/zizmor/lib/finding.ts";
import { annotated, primary, withKeys } from "#/features/zizmor/lib/location.ts";
import {
  isReusableOnly,
  jobLocation,
  jobLocationWithGrip,
  normalJobsOf,
  workflowLocation,
} from "#/features/zizmor/lib/workflow.ts";
import type { Audit } from "#/features/zizmor/model/audit.ts";
import type { FindingDraft, SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { WorkflowInput } from "#/features/zizmor/model/input.ts";

const meta: AuditMeta = {
  ident: "concurrency-limits",
  desc: "insufficient job-level concurrency limits",
};

const base = (location: SymbolicLocation): FindingDraft =>
  pipe(finding(meta), confidence("high"), severity("low"), persona("pedantic"), at(location));

const missing = (
  workflow: WorkflowInput,
  related: readonly SymbolicLocation[],
): readonly FindingDraft[] => {
  if (Arr.isReadonlyArrayEmpty(related)) {
    return [];
  }
  const location = pipe(
    workflowLocation(workflow),
    primary,
    withKeys("on"),
    annotated("workflow is missing concurrency setting"),
  );
  return [at(...related)(base(location))];
};

export const concurrencyLimits: Audit = {
  ...meta,
  workflow: (workflow) => {
    if (isReusableOnly(workflow)) {
      return [];
    }
    return Option.match(workflow.model.concurrency, {
      onSome: (concurrency) => {
        if (concurrency.type === "rich") {
          return [];
        }
        return [
          base(
            pipe(
              workflowLocation(workflow),
              primary,
              withKeys("concurrency"),
              annotated("workflow concurrency is missing cancel-in-progress"),
            ),
          ),
        ];
      },
      onNone: () => {
        const jobs = normalJobsOf(workflow);
        const bare = pipe(
          jobs,
          Arr.filter((job) => Option.exists(job.model.concurrency, (each) => each.type === "bare")),
          Arr.map((job) =>
            annotated("job concurrency is missing cancel-in-progress")(
              withKeys("concurrency")(jobLocation(job)),
            ),
          ),
        );
        const absent = pipe(
          jobs,
          Arr.filter((job) => Option.isNone(job.model.concurrency)),
          Arr.map((job) =>
            annotated("job affected by missing workflow concurrency")(jobLocationWithGrip(job)),
          ),
        );
        return [...missing(workflow, bare), ...missing(workflow, absent)];
      },
    });
  },
};
