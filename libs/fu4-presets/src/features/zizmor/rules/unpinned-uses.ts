import { Option, pipe } from "effect";

import { policyFor } from "#/features/zizmor/lib/config.ts";
import { at, atPath, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import {
  annotated,
  hidden,
  primary,
  withinText,
  withKeys,
} from "#/features/zizmor/lib/location.ts";
import { isLocked } from "#/features/zizmor/lib/lock.ts";
import { displayPattern, isUnhashed, isUnpinned } from "#/features/zizmor/lib/uses.ts";
import { jobLocation } from "#/features/zizmor/lib/workflow.ts";
import type { Audit, AuditContext, Drafts } from "#/features/zizmor/model/audit.ts";
import type { Uses } from "#/features/zizmor/model/common.ts";
import type { SymbolicLocation } from "#/features/zizmor/model/finding.ts";

const meta = { ident: "unpinned-uses", desc: "unpinned action reference" } as const;

const annotationOf = (uses: Uses, context: AuditContext): Option.Option<string> => {
  if (uses.type !== "repository") {
    return Option.none();
  }
  const [pattern, policy] = policyFor(context.config.unpinnedUses)(uses);
  const described = pipe(
    pattern,
    Option.filter((each) => each.type !== "any"),
    Option.match({ onNone: () => "blanket", onSome: displayPattern }),
  );
  if (policy === "ref-pin") {
    return Option.liftPredicate(
      `action is not pinned to a ref or hash (required by ${described} policy)`,
      () => isUnpinned(uses),
    );
  }
  if (policy === "hash-pin") {
    return Option.liftPredicate(
      `action is not pinned to a hash (required by ${described} policy)`,
      () => isUnhashed(uses),
    );
  }
  return Option.none();
};

const check = (uses: Uses, location: SymbolicLocation, context: AuditContext): Drafts =>
  pipe(
    annotationOf(uses, context),
    Option.map((annotation) =>
      pipe(
        finding(meta),
        confidence("high"),
        severity("high"),
        at(hidden(location)),
        atPath(location, primary, withKeys("uses"), withinText(uses.raw), annotated(annotation)),
      ),
    ),
    Option.toArray,
  );

const compositeStep: NonNullable<Audit["compositeStep"]> = (view, context) => {
  if (view.body.type === "uses") {
    return check(view.body.uses, view.location, context);
  }
  return [];
};

export const unpinnedUses: Audit = {
  ...meta,
  step: (view, context) => {
    if (isLocked(context.project)(view.input.path)) {
      return [];
    }
    return compositeStep(view, context);
  },
  compositeStep,
  reusableJob: (job, context) => check(job.model.uses, jobLocation(job), context),
};
