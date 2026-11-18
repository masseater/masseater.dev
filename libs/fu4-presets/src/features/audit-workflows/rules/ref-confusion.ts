import { Array as Arr, Effect, Option, pipe } from "effect";

import { at, confidence, finding, severity } from "#/features/audit-workflows/lib/finding.ts";
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
import { refSlug, symbolicRef } from "#/features/audit-workflows/lib/uses.ts";
import type {
  Audit,
  AuditContext,
  Drafts,
  Produced,
} from "#/features/audit-workflows/model/audit.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";
import type { NamedRef } from "#/features/audit-workflows/model/github.ts";

const meta = {
  ident: "ref-confusion",
  desc: "git ref for action with ambiguous ref type",
} as const;

const ANNOTATION = "uses a ref that's provided by both the branch and tag namespaces";

const locations = (target: UsesTarget): readonly SymbolicLocation[] => {
  if (target.kind === "repo") {
    return [
      pipe(target.location, withKeys("repo"), withinText(target.repo), annotated("this repo")),
      pipe(
        target.location,
        primary,
        withKeys("rev"),
        withinText(target.raw),
        annotated(ANNOTATION),
      ),
    ];
  }
  if (target.kind === "reusable") {
    return [pipe(target.location, primary, annotated(ANNOTATION))];
  }
  return [pipe(target.location, primary, withKeys("uses"), annotated(ANNOTATION))];
};

const draft = (target: UsesTarget) => (): Drafts => [
  pipe(finding(meta), severity("medium"), confidence("high"), at(...locations(target))),
];

const named =
  (name: string) =>
  (refs: readonly NamedRef[]): boolean =>
    pipe(
      refs,
      Arr.some((ref) => ref.name === name),
    );

const check = (target: UsesTarget, context: AuditContext): Produced =>
  Option.match(Option.all([refSlug(target.ref), symbolicRef(target.ref)]), {
    onNone: (): Produced => [],
    onSome: ([slug, name]) =>
      withGitHub(context)((client) =>
        Effect.map(client.refs(slug.full), ({ branches, tags }) =>
          draftsIf(draft(target))(named(name)(branches) && named(name)(tags)),
        ),
      ),
  });

const step = stepTargetCheck(check);

export const refConfusion: Audit = {
  ...meta,
  step,
  compositeStep: step,
  reusableJob: reusableTargetCheck(check),
  preCommitRepo: repoTargetCheck(check),
};
