import { Effect, Option, pipe } from "effect";

import { at, confidence, finding, severity } from "#/features/audit-workflows/lib/finding.ts";
import { isImpostor } from "#/features/audit-workflows/lib/impostor.ts";
import {
  annotated,
  primary,
  withinText,
  withKeys,
} from "#/features/audit-workflows/lib/location.ts";
import { draftsIf, withGitHub } from "#/features/audit-workflows/lib/online.ts";
import {
  repoTargetCheck,
  reusableTargetCheck,
  stepTargetCheck,
} from "#/features/audit-workflows/lib/uses-targets.ts";
import type { UsesTarget } from "#/features/audit-workflows/lib/uses-targets.ts";
import { commitRef, refSlug } from "#/features/audit-workflows/lib/uses.ts";
import type {
  Audit,
  AuditContext,
  Drafts,
  Produced,
} from "#/features/audit-workflows/model/audit.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";

const meta = {
  ident: "impostor-commit",
  desc: "commit with no history in referenced repository",
} as const;

const ANNOTATION = "uses a commit that doesn't belong to the specified org/repo";

const flagged = (target: UsesTarget): SymbolicLocation => {
  if (target.kind === "repo") {
    return pipe(target.location, withKeys("rev"), annotated(ANNOTATION), primary);
  }
  return pipe(
    target.location,
    withKeys("uses"),
    withinText(target.raw),
    primary,
    annotated(ANNOTATION),
  );
};

const draft = (target: UsesTarget) => (): Drafts => [
  pipe(finding(meta), severity("high"), confidence("high"), at(target.grip), at(flagged(target))),
];

const check = (target: UsesTarget, context: AuditContext): Produced =>
  Option.match(Option.all([refSlug(target.ref), commitRef(target.ref)]), {
    onNone: (): Produced => [],
    onSome: ([slug, sha]) =>
      withGitHub(context)((client) =>
        Effect.map(isImpostor(client)(slug.full)(sha), draftsIf(draft(target))),
      ),
  });

const step = stepTargetCheck(check);

export const impostorCommit: Audit = {
  ...meta,
  step,
  compositeStep: step,
  reusableJob: reusableTargetCheck(check),
  preCommitRepo: repoTargetCheck(check),
};
