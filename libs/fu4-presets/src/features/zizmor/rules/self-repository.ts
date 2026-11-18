import { String as Str, pipe } from "effect";

import { at, atPath, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import { annotated, primary, withinText, withKeys } from "#/features/zizmor/lib/location.ts";
import { jobLocation, jobLocationWithGrip } from "#/features/zizmor/lib/workflow.ts";
import type { Audit, Drafts } from "#/features/zizmor/model/audit.ts";
import type { Uses } from "#/features/zizmor/model/common.ts";
import type { SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

const meta = {
  ident: "self-repository",
  desc: "use GitHub's dedicated self-repository syntax",
} as const;

const check = (location: SymbolicLocation, grip: SymbolicLocation, uses: Uses): Drafts => {
  if (uses.type !== "local" || Str.startsWith("$")(uses.raw)) {
    return [];
  }
  return [
    pipe(
      finding(meta),
      severity("low"),
      confidence("high"),
      at(grip),
      atPath(
        location,
        withKeys("uses"),
        withinText(uses.raw),
        annotated("use '$/...' instead of './...'"),
        primary,
      ),
    ),
  ];
};

const step = (view: StepView): Drafts => {
  if (view.body.type !== "uses") {
    return [];
  }
  return check(view.location, view.locationWithGrip, view.body.uses);
};

export const selfRepository: Audit = {
  ...meta,
  reusableJob: (job) => check(jobLocation(job), jobLocationWithGrip(job), job.model.uses),
  step,
  compositeStep: step,
};
