import { Option, pipe } from "effect";

import { atPath, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import { annotated, primary, withinText, withKeys } from "#/features/zizmor/lib/location.ts";
import { jobLocation } from "#/features/zizmor/lib/workflow.ts";
import type { Audit } from "#/features/zizmor/model/audit.ts";

const meta = {
  ident: "secrets-inherit",
  desc: "secrets unconditionally inherited by called workflow",
} as const;

export const secretsInherit: Audit = {
  ...meta,
  reusableJob: (job) => {
    if (!Option.exists(job.model.secrets, (secrets) => secrets.type === "inherit")) {
      return [];
    }
    return [
      pipe(
        finding(meta),
        atPath(
          jobLocation(job),
          primary,
          withKeys("uses"),
          withinText(job.model.uses.raw),
          annotated("this reusable workflow"),
        ),
        atPath(jobLocation(job), withKeys("secrets"), annotated("inherits all parent secrets")),
        confidence("high"),
        severity("medium"),
      ),
    ];
  },
};
