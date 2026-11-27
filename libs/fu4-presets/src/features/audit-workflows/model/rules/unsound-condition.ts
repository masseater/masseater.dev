import { Array as Arr, Option, pipe } from "effect";

import { actionConditions } from "#/features/audit-workflows/lib/action.ts";
import { extractFenced } from "#/features/audit-workflows/lib/expressions.ts";
import {
  at,
  atPath,
  confidence,
  finding,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import { annotated, hidden, primary, withKeys } from "#/features/audit-workflows/lib/location.ts";
import { jobConditions } from "#/features/audit-workflows/lib/workflow-steps.ts";
import { jobLocation } from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { If } from "#/features/audit-workflows/model/common.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";

const meta = { ident: "unsound-condition", desc: "unsound conditional expression" } as const;

const START = 0;

const isUnsound = (condition: If): boolean =>
  condition.type === "expr" &&
  Option.exists(
    extractFenced(condition.raw)(START),
    (found) => condition.raw.length > found.expr.raw.length,
  );

const process = (conditions: readonly (readonly [If, SymbolicLocation])[]): Drafts =>
  pipe(
    conditions,
    Arr.filter(([condition]) => isUnsound(condition)),
    Arr.map(([, location]) =>
      pipe(
        finding(meta),
        severity("high"),
        confidence("high"),
        at(hidden(location)),
        atPath(location, withKeys("if"), primary, annotated("condition always evaluates to true")),
      ),
    ),
  );

export const unsoundCondition: Audit = {
  ...meta,
  normalJob: (job) => process(jobConditions(job)),
  reusableJob: (job) =>
    job.model.if.pipe(
      Option.toArray,
      Arr.map((condition) => [condition, jobLocation(job)] as const),
      process,
    ),
  action: (action) => process(actionConditions(action)),
};
