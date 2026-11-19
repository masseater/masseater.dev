import { Alerting, CloudflareEnvironment } from "@alchemy.run/cloudflare";
import { listPolicies } from "@distilled.cloud/cloudflare/alerting";
import type { PoliciesListResultItem } from "@distilled.cloud/cloudflare/alerting";
import { Array as Arr, Effect, Option, pipe } from "effect";

const BUDGET_ALERT = "billing_budget_alert";

const LOGPUSH_DISABLED = "failing_logpush_job_disabled_alert";

const budgetEmails = (policies: readonly PoliciesListResultItem[]): readonly { id: string }[] =>
  pipe(
    policies,
    Arr.filter((policy) => policy.alertType === BUDGET_ALERT),
    Arr.flatMap((policy) => policy.mechanisms?.email ?? []),
    Arr.filterMap(({ id }) => Option.fromNullishOr(id)),
    Arr.dedupe,
    Arr.map((id) => ({ id })),
  );

export const logArchiveAlert = Effect.fn("logArchiveAlert")(function* logArchiveAlert(
  appName: string,
) {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const policies = yield* listPolicies({ accountId }).pipe(Effect.orDie);
  const email = budgetEmails(policies.result);
  if (Arr.isReadonlyArrayEmpty(email)) {
    return yield* Effect.die(
      new Error(`no ${BUDGET_ALERT} email destination to send ${LOGPUSH_DISABLED} to`),
    );
  }
  return yield* Alerting.NotificationPolicy("LogArchiveDisabled", {
    name: `${appName}-log-archive-disabled`,
    alertType: LOGPUSH_DISABLED,
    description: "A Logpush job that archives Worker logs to R2 was disabled after failing",
    mechanisms: { email },
  });
});
