import { Array as Arr, Option, pipe } from "effect";

import { csharpBool } from "#/features/audit-workflows/lib/env.ts";
import {
  atPath,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import { annotated, primary, withKeys } from "#/features/audit-workflows/lib/location.ts";
import { stepLocation, stepsOf } from "#/features/audit-workflows/lib/workflow-steps.ts";
import {
  jobLocation,
  normalJobsOf,
  workflowLocation,
} from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { EnvValue, LoE } from "#/features/audit-workflows/model/common.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";

const meta = {
  ident: "insecure-commands",
  desc: "execution of insecure workflow commands is enabled",
} as const;

const check = (env: LoE<ReadonlyMap<string, EnvValue>>, location: SymbolicLocation): Drafts => {
  if (env.type === "expr") {
    return [
      pipe(
        finding(meta),
        confidence("low"),
        severity("high"),
        persona("auditor"),
        atPath(
          location,
          primary,
          withKeys("env"),
          annotated("non-static environment may contain ACTIONS_ALLOW_UNSECURE_COMMANDS"),
        ),
      ),
    ];
  }
  if (
    !Option.exists(
      Option.fromNullishOr(env.value.get("ACTIONS_ALLOW_UNSECURE_COMMANDS")),
      csharpBool,
    )
  ) {
    return [];
  }
  return [
    pipe(
      finding(meta),
      confidence("high"),
      severity("high"),
      atPath(location, primary, withKeys("env"), annotated("insecure commands enabled here")),
    ),
  ];
};

export const insecureCommands: Audit = {
  ...meta,
  workflow: (workflow) => [
    ...check(workflow.model.env, workflowLocation(workflow)),
    ...Arr.flatMap(normalJobsOf(workflow), (job) => [
      ...check(job.model.env, jobLocation(job)),
      ...pipe(
        stepsOf(job),
        Arr.filter((step) => step.model.body.type === "run"),
        Arr.flatMap((step) => check(step.model.env, stepLocation(step))),
      ),
    ]),
  ],
  compositeStep: (step) => {
    if (step.body.type === "run") {
      return check(step.env, step.location);
    }
    return [];
  },
};
