import { Array as Arr, Boolean as Bool, Option, pipe } from "effect";

import {
  at,
  atPath,
  confidence,
  finding,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import {
  annotated,
  primary,
  withinText,
  withKeys,
} from "#/features/audit-workflows/lib/location.ts";
import { stepLocation, stepsOf, stepView } from "#/features/audit-workflows/lib/workflow-steps.ts";
import { jobLocation, jobLocationWithGrip } from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { If } from "#/features/audit-workflows/model/common.ts";
import type { SymbolicLocation, Confidence } from "#/features/audit-workflows/model/finding.ts";

import { spoofsIn } from "./bot-conditions-walk.ts";
import type { Spoof } from "./bot-conditions-walk.ts";

const meta = { ident: "bot-conditions", desc: "spoofable bot actor check" } as const;

type Draft = Drafts[number];

type Condition = readonly [If, SymbolicLocation, SymbolicLocation];

const confidenceOf = (dominating: boolean): Exclude<Confidence, "low"> =>
  Bool.match(dominating, { onTrue: () => "high", onFalse: () => "medium" });

const spoofedAt =
  (ifLocation: SymbolicLocation) =>
  (raw: string): ((draft: Draft) => Draft) =>
    atPath(ifLocation, primary, withinText(raw), annotated("actor context may be spoofable"));

const draftOf =
  (parent: SymbolicLocation, ifLocation: SymbolicLocation) =>
  ({ raw, dominating }: Spoof): Draft =>
    pipe(
      finding(meta),
      severity("high"),
      confidence(confidenceOf(dominating)),
      at(parent),
      spoofedAt(ifLocation)(raw),
    );

const conditionDrafts = ([condition, parent, ifLocation]: Condition): Drafts => {
  if (condition.type !== "expr") {
    return [];
  }
  return Arr.map(spoofsIn(condition.raw), draftOf(parent, ifLocation));
};

const process = (conditions: readonly Condition[]): Drafts =>
  pipe(conditions, Arr.flatMap(conditionDrafts));

export const botConditions: Audit = {
  ...meta,
  normalJob: (job) =>
    process([
      ...Arr.map(
        Option.toArray(job.model.if),
        (condition) =>
          [condition, jobLocationWithGrip(job), withKeys("if")(jobLocation(job))] as const,
      ),
      ...Arr.flatMap(stepsOf(job), (step) =>
        Arr.map(
          Option.toArray(step.model.if),
          (condition) =>
            [
              condition,
              stepView(step).locationWithGrip,
              withKeys("if")(stepLocation(step)),
            ] as const,
        ),
      ),
    ]),
  reusableJob: (job) =>
    process(
      Arr.map(
        Option.toArray(job.model.if),
        (condition) =>
          [condition, jobLocationWithGrip(job), withKeys("if")(jobLocation(job))] as const,
      ),
    ),
};
