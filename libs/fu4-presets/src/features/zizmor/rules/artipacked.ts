import { Array as Arr, Effect, Option, Order, pipe } from "effect";

import { compositeSteps } from "#/features/zizmor/lib/action.ts";
import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/zizmor/lib/finding.ts";
import { annotated, primary } from "#/features/zizmor/lib/location.ts";
import { stepView, stepsOf } from "#/features/zizmor/lib/workflow-steps.ts";
import type { Audit, AuditContext, Drafts, Produced } from "#/features/zizmor/model/audit.ts";
import type { Severity } from "#/features/zizmor/model/finding.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

import { resolving } from "./artipacked-online.ts";
import { checkoutOf, isVulnerableUpload } from "./artipacked-steps.ts";
import type { Checkout } from "./artipacked-steps.ts";

const meta = {
  ident: "artipacked",
  desc: "credential persistence through GitHub Actions artifacts",
} as const;

const severityOf = (modern: Option.Option<boolean>, noUploads: boolean): Severity => {
  if (Option.contains(modern, true)) {
    if (noUploads) {
      return "low";
    }
    return "medium";
  }
  if (noUploads) {
    return "medium";
  }
  return "high";
};

const before = (left: readonly number[], right: readonly number[]): boolean =>
  Order.isLessThan(Arr.makeOrder(Order.Number))(left, right);

const drafted =
  (steps: readonly StepView[]) =>
  (checkouts: readonly Checkout[]): Drafts => {
    const uploads = pipe(steps, Arr.filter(isVulnerableUpload));
    if (Arr.isReadonlyArrayEmpty(uploads)) {
      return pipe(
        checkouts,
        Arr.map((checkout) =>
          pipe(
            finding(meta),
            severity(severityOf(checkout.modern, true)),
            confidence("low"),
            persona(checkout.persona),
            atPath(
              checkout.step.location,
              primary,
              annotated("does not set persist-credentials: false"),
            ),
          ),
        ),
      );
    }
    return pipe(
      checkouts,
      Arr.flatMap((checkout) =>
        pipe(
          uploads,
          Arr.filter((upload) => before(checkout.step.order, upload.order)),
          Arr.map((upload) =>
            pipe(
              finding(meta),
              severity(severityOf(checkout.modern, false)),
              confidence("high"),
              persona(checkout.persona),
              atPath(
                checkout.step.location,
                primary,
                annotated("does not set persist-credentials: false"),
              ),
              at(annotated("may leak the credentials persisted above")(upload.location)),
            ),
          ),
        ),
      ),
    );
  };

const process = (steps: readonly StepView[], context: AuditContext): Produced => {
  const checkouts = pipe(steps, Arr.flatMap(checkoutOf));
  const draft = drafted(steps);
  return Option.match(resolving(context)(checkouts), {
    onNone: () => draft(checkouts),
    onSome: Effect.map(draft),
  });
};

export const artipacked: Audit = {
  ...meta,
  action: (action, context) =>
    process(
      Option.getOrElse(compositeSteps(action), () => []),
      context,
    ),
  normalJob: (job, context) => process(Arr.map(stepsOf(job), stepView), context),
};
