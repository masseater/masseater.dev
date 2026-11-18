import { Effect, Option, String as Str, pipe } from "effect";

import { at, confidence, finding, persona, severity, tip } from "#/features/zizmor/lib/finding.ts";
import { firstSquat } from "#/features/zizmor/lib/typosquat.ts";
import {
  repoTargetCheck,
  reusableTargetCheck,
  stepTargetCheck,
} from "#/features/zizmor/lib/uses-targets.ts";
import type { UsesTarget } from "#/features/zizmor/lib/uses-targets.ts";
import { refSlug } from "#/features/zizmor/lib/uses.ts";
import type { RepoRef } from "#/features/zizmor/lib/uses.ts";
import type { Audit, AuditContext, Drafts, Produced } from "#/features/zizmor/model/audit.ts";
import type { Confidence, FindingDraft } from "#/features/zizmor/model/finding.ts";

const meta = {
  ident: "typosquat-uses",
  desc: "repository reference resembles a popular repository",
} as const;

interface Squat {
  readonly slug: string;
  readonly annotation: string;
}

const squat = (ref: RepoRef): Option.Option<Squat> =>
  Option.flatMap(refSlug(ref), (slug) => {
    const normalized = Str.toLowerCase(slug.full);
    return Option.map(firstSquat(normalized)(Str.toLowerCase(slug.owner)), (found) => ({
      slug: slug.full,
      annotation: `${normalized} ${found}`,
    }));
  });

const base =
  (target: UsesTarget) =>
  (level: Confidence, annotation: string): FindingDraft =>
    pipe(
      finding(meta),
      severity("high"),
      persona("regular"),
      confidence(level),
      at(target.grip),
      at(target.at(annotation)),
    );

const offline = (target: UsesTarget, found: Squat): Drafts => [
  pipe(
    base(target)("low", found.annotation),
    tip("run with a GitHub token to check whether this repository actually exists"),
  ),
];

const checked =
  (target: UsesTarget, found: Squat) =>
  (exists: boolean): Drafts => {
    if (exists) {
      return [base(target)("high", `${found.annotation} and resolves to a live repository`)];
    }
    return [base(target)("low", `${found.annotation} (currently unregistered)`)];
  };

const check = (target: UsesTarget, context: AuditContext): Produced =>
  Option.match(squat(target.ref), {
    onNone: (): Produced => [],
    onSome: (found) =>
      Option.match(context.github, {
        onNone: () => offline(target, found),
        onSome: (client) =>
          client.exists(found.slug).pipe(
            Effect.map(checked(target, found)),
            Effect.orElseSucceed((): Drafts => [base(target)("low", found.annotation)]),
          ),
      }),
  });

const step = stepTargetCheck(check);

export const typosquatUses: Audit = {
  ...meta,
  step,
  compositeStep: step,
  reusableJob: reusableTargetCheck(check),
  preCommitRepo: repoTargetCheck(check),
};
