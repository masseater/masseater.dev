import { Effect, Option, pipe } from "effect";

import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/zizmor/lib/finding.ts";
import { longestTag } from "#/features/zizmor/lib/github-refs.ts";
import { hidden, primary, withinText, withKeys } from "#/features/zizmor/lib/location.ts";
import { draftsIf, withGitHub } from "#/features/zizmor/lib/online.ts";
import { reusableTargetCheck, stepTargetCheck } from "#/features/zizmor/lib/uses-targets.ts";
import type { UsesTarget } from "#/features/zizmor/lib/uses-targets.ts";
import { commitRef } from "#/features/zizmor/lib/uses.ts";
import type { Audit, AuditContext, Drafts, Produced } from "#/features/zizmor/model/audit.ts";

const meta = {
  ident: "stale-action-refs",
  desc: "commit hash does not point to a Git tag",
} as const;

const draft = (target: UsesTarget) => (): Drafts => [
  pipe(
    finding(meta),
    confidence("high"),
    severity("low"),
    persona("pedantic"),
    at(hidden(target.location)),
    atPath(target.location, primary, withKeys("uses"), withinText(target.raw)),
  ),
];

const check = (target: UsesTarget, context: AuditContext): Produced =>
  Option.match(commitRef(target.ref), {
    onNone: (): Produced => [],
    onSome: (commit) =>
      withGitHub(context)((client) =>
        Effect.map(longestTag(client)(target.ref)(commit), (tag) =>
          draftsIf(draft(target))(Option.isNone(tag)),
        ),
      ),
  });

const step = stepTargetCheck(check);

export const staleActionRefs: Audit = {
  ...meta,
  step,
  compositeStep: step,
  reusableJob: reusableTargetCheck(check),
};
