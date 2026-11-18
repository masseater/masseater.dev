import { Option } from "effect";

import { isLocked } from "#/features/zizmor/lib/lock.ts";
import { withGitHub } from "#/features/zizmor/lib/online.ts";
import { reusableTargetCheck, stepTargetCheck } from "#/features/zizmor/lib/uses-targets.ts";
import type { UsesTarget } from "#/features/zizmor/lib/uses-targets.ts";
import { commitRef, refSlug } from "#/features/zizmor/lib/uses.ts";
import type { Audit, AuditContext, Produced } from "#/features/zizmor/model/audit.ts";

import { audited, meta } from "./ref-version-mismatch-drafts.ts";
import { commentState } from "./ref-version-mismatch-parts.ts";

const check = (target: UsesTarget, context: AuditContext): Produced =>
  Option.match(Option.all([refSlug(target.ref), commitRef(target.ref), commentState(target)]), {
    onNone: (): Produced => [],
    onSome: ([slug, commit, state]) =>
      withGitHub(context)((client) => audited({ target, client, slug: slug.full, commit })(state)),
  });

const steps = stepTargetCheck(check);

export const refVersionMismatch: Audit = {
  ...meta,
  step: (view, context) => {
    if (isLocked(context.project)(view.input.path)) {
      return [];
    }
    return steps(view, context);
  },
  compositeStep: steps,
  reusableJob: reusableTargetCheck(check),
};
