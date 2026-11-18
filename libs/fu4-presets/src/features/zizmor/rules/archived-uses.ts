import { Option, String as Str, pipe } from "effect";

import { at, confidence, finding, persona, severity } from "#/features/zizmor/lib/finding.ts";
import {
  repoTargetCheck,
  reusableTargetCheck,
  stepTargetCheck,
} from "#/features/zizmor/lib/uses-targets.ts";
import type { UsesTarget } from "#/features/zizmor/lib/uses-targets.ts";
import { refSlug } from "#/features/zizmor/lib/uses.ts";
import type { RepoRef } from "#/features/zizmor/lib/uses.ts";
import type { Audit, Drafts } from "#/features/zizmor/model/audit.ts";
import archived from "#/shared/data/zizmor/archived-repos.json" with { type: "json" };

const meta = {
  ident: "archived-uses",
  desc: "action or reusable workflow from archived repository",
} as const;

const ARCHIVED: ReadonlySet<string> = new Set(archived);

const isArchived = (ref: RepoRef): boolean =>
  Option.exists(refSlug(ref), (slug) =>
    ARCHIVED.has(`${Str.toLowerCase(slug.owner)}/${Str.toLowerCase(slug.repo)}`),
  );

const check = (target: UsesTarget): Drafts => {
  if (!isArchived(target.ref)) {
    return [];
  }
  return [
    pipe(
      finding(meta),
      confidence("high"),
      severity("medium"),
      persona("regular"),
      at(target.grip),
      at(target.at("repository is archived")),
    ),
  ];
};

const step = stepTargetCheck(check);

export const archivedUses: Audit = {
  ...meta,
  step,
  compositeStep: step,
  reusableJob: reusableTargetCheck(check),
  preCommitRepo: repoTargetCheck(check),
};
