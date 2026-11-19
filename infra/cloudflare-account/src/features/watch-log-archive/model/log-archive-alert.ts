import { Alerting, CloudflareEnvironment } from "@alchemy.run/cloudflare";
import { listPolicies } from "@distilled.cloud/cloudflare/alerting";
import { Array as Arr, Effect, Schema, pipe } from "effect";

const BUDGET_ALERT = "billing_budget_alert";

const LOGPUSH_DISABLED = "failing_logpush_job_disabled_alert";

const EmailDestination = Schema.Struct({ id: Schema.String });

const BudgetPolicy = Schema.Struct({
  alertType: Schema.Literal(BUDGET_ALERT),
  mechanisms: Schema.Struct({ email: Schema.Array(EmailDestination) }),
});

const decodeBudgetPolicy = Schema.decodeUnknownOption(BudgetPolicy);

const budgetEmails = (policies: readonly unknown[]): readonly (typeof EmailDestination.Type)[] =>
  pipe(
    policies,
    Arr.map((policy) => decodeBudgetPolicy(policy)),
    Arr.getSomes,
    Arr.flatMap(({ mechanisms }) => mechanisms.email),
    Arr.dedupeWith((left, right) => left.id === right.id),
  );

/** @internal */
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
