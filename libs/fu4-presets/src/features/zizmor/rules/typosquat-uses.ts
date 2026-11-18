import { Option, String as Str, pipe } from "effect";

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
import type { Audit, Drafts } from "#/features/zizmor/model/audit.ts";

const meta = {
  ident: "typosquat-uses",
  desc: "repository reference resembles a popular repository",
} as const;

const squat = (ref: RepoRef): Option.Option<string> =>
  Option.flatMap(refSlug(ref), (slug) => {
    const normalized = Str.toLowerCase(slug.full);
    return Option.map(
      firstSquat(normalized)(Str.toLowerCase(slug.owner)),
      (found) => `${normalized} ${found}`,
    );
  });

const check = (target: UsesTarget): Drafts =>
  pipe(
    squat(target.ref),
    Option.map((annotation) =>
      pipe(
        finding(meta),
        severity("high"),
        persona("regular"),
        tip("run with a GitHub token to check whether this repository actually exists"),
        confidence("low"),
        at(target.grip),
        at(target.at(annotation)),
      ),
    ),
    Option.toArray,
  );

const step = stepTargetCheck(check);

export const typosquatUses: Audit = {
  ...meta,
  step,
  compositeStep: step,
  reusableJob: reusableTargetCheck(check),
  preCommitRepo: repoTargetCheck(check),
};
