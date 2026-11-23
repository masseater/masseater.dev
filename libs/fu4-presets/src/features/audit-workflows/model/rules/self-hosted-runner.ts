import { Array as Arr, pipe } from "effect";

import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import { annotated, primary, withKeys } from "#/features/audit-workflows/lib/location.ts";
import { runnersOf } from "#/features/audit-workflows/lib/runners.ts";
import type { Runner } from "#/features/audit-workflows/lib/runners.ts";
import { jobLocation } from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type {
  FindingDraft,
  SymbolicLocation,
  Severity,
} from "#/features/audit-workflows/model/finding.ts";
import type { NormalJob } from "#/features/audit-workflows/model/input.ts";

const meta = { ident: "self-hosted-runner", desc: "runs on a self-hosted runner" } as const;

const base = (
  job: NormalJob,
  annotation: string,
  level: Exclude<Severity, "informational" | "medium">,
): FindingDraft =>
  pipe(
    finding(meta),
    confidence(level),
    severity("medium"),
    persona("auditor"),
    atPath(jobLocation(job), primary, withKeys("runs-on"), annotated(annotation)),
  );

interface Located {
  readonly fromMatrix: boolean;
  readonly location: SymbolicLocation;
}

const withMatrix =
  (annotation: string, { fromMatrix, location }: Located) =>
  (draft: FindingDraft): FindingDraft => {
    if (fromMatrix) {
      return at(annotated(annotation)(withKeys("strategy")(location)))(draft);
    }
    return draft;
  };

const reported =
  (job: NormalJob) =>
  (runner: Runner): Drafts => {
    if (runner.type === "self-hosted") {
      if (runner.evidence === "runner-group") {
        return [base(job, "runner group used here", "high")];
      }
      return [
        withMatrix(
          "matrix declares self-hosted runner",
          runner,
        )(base(job, "self-hosted runner used here", "high")),
      ];
    }
    if (runner.type === "indeterminate" && runner.selfHostedEvidence) {
      return [
        withMatrix(
          "matrix may use self-hosted runners",
          runner,
        )(base(job, "expression may expand into a self-hosted runner", "low")),
      ];
    }
    return [];
  };

export const selfHostedRunner: Audit = {
  ...meta,
  normalJob: (job, context) =>
    Arr.flatMap(
      runnersOf(job)({
        denyRunners: context.config.denyRunners,
        allowGroups: context.config.allowGroups,
      }),
      reported(job),
    ),
};
