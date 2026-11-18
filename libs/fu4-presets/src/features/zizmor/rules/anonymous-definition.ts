import { Array as Arr, Option, pipe } from "effect";

import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
  tip,
} from "#/features/zizmor/lib/finding.ts";
import { primary } from "#/features/zizmor/lib/location.ts";
import {
  jobLocationWithGrip,
  normalJobsOf,
  workflowLocation,
} from "#/features/zizmor/lib/workflow.ts";
import type { Audit, Drafts } from "#/features/zizmor/model/audit.ts";

const meta = {
  ident: "anonymous-definition",
  desc: "workflow or action definition without a name",
} as const;

export const anonymousDefinition: Audit = {
  ...meta,
  workflow: (workflow) => {
    const workflowAt = primary(workflowLocation(workflow));
    const named: Drafts = Option.match(workflow.model.name, {
      onSome: () => [],
      onNone: () => [
        pipe(
          finding(meta),
          severity("low"),
          confidence("high"),
          persona("pedantic"),
          at(workflowAt),
          tip("use 'name: ...' to give this workflow a name"),
        ),
      ],
    });
    const jobs = pipe(
      normalJobsOf(workflow),
      Arr.filter((job) => Option.isNone(job.model.name)),
      Arr.map((job) =>
        pipe(
          finding(meta),
          severity("informational"),
          confidence("high"),
          persona("pedantic"),
          atPath(jobLocationWithGrip(job), primary),
          tip("use 'name: ...' to give this job a name"),
        ),
      ),
    );
    return [...named, ...jobs];
  },
};
