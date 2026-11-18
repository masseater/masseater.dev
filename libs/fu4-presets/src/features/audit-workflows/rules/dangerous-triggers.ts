import { Array as Arr, Option, pipe } from "effect";

import { fixed, usageOf } from "#/features/audit-workflows/lib/coordinate.ts";
import {
  at,
  atPath,
  confidence,
  finding,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import { annotated, hidden, primary, withKeys } from "#/features/audit-workflows/lib/location.ts";
import { stepView, stepsOf } from "#/features/audit-workflows/lib/workflow-steps.ts";
import {
  DANGEROUS_TRIGGERS,
  jobsOf,
  triggerAt,
  workflowLocation,
} from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import type { Job, WorkflowInput } from "#/features/audit-workflows/model/input.ts";

const meta = {
  ident: "dangerous-triggers",
  desc: "use of fundamentally insecure workflow trigger",
} as const;

const LABELER = fixed("actions/labeler");

const onlyOne = <Value>(items: readonly Value[]): Option.Option<Value> =>
  Arr.match(items, {
    onEmpty: () => Option.none(),
    onNonEmpty: ([first, ...rest]) =>
      Option.liftPredicate(first, () => Arr.isReadonlyArrayEmpty(rest)),
  });

const isNormal = (job: Job): job is Extract<Job, { readonly type: "normal" }> =>
  job.type === "normal";

const isLabelerOnly = (workflow: WorkflowInput): boolean =>
  pipe(
    onlyOne(jobsOf(workflow)),
    Option.filter(isNormal),
    Option.flatMap((job) => onlyOne(stepsOf(job.job))),
    Option.exists((step) => Option.isSome(usageOf(LABELER)(stepView(step)))),
  );

export const dangerousTriggers: Audit = {
  ...meta,
  workflow: (workflow) => {
    const on = withKeys("on")(workflowLocation(workflow));
    return pipe(
      DANGEROUS_TRIGGERS,
      Arr.filter((event) => event !== "pull_request_target" || !isLabelerOnly(workflow)),
      Arr.flatMap((event) =>
        Arr.map(Option.toArray(triggerAt(event)(workflow)), (location) =>
          pipe(
            finding(meta),
            confidence("medium"),
            severity("high"),
            at(hidden(on)),
            atPath(location, primary, annotated(`${event} is almost always used insecurely`)),
          ),
        ),
      ),
    );
  },
};
