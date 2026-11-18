import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { WebhookEvent } from "#/entities/workflow/model/types.ts";
import type { Fail } from "#/features/actionlint/lib/workflow-rule.ts";
import webhooks from "#/shared/data/webhooks.json" with { type: "json" };
import { quote, sortedQuotes } from "#/shared/text/index.ts";

import { checkExclusive } from "./filters.ts";

const WEBHOOKS: Readonly<Record<string, readonly string[] | string>> = webhooks;
const WORKFLOW_RUN = "workflow_run";
const UNKNOWN_DOCS =
  "https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#webhook-events";

const checkTypes =
  (fail: Fail, event: WebhookEvent) =>
  (expected: readonly string[]): void => {
    const hook = quote(event.hook.value);
    if (Arr.isReadonlyArrayEmpty(expected) && Arr.isReadonlyArrayNonEmpty(event.types)) {
      fail(event.hook, `"types" cannot be specified for ${hook} Webhook event`);
      return;
    }
    const invalid = pipe(
      event.types,
      Arr.filter((kind) => !Arr.contains(expected, kind.value)),
    );
    for (const kind of invalid) {
      fail(
        kind,
        `invalid activity type ${quote(kind.value)} for ${hook} Webhook event. available types are ${sortedQuotes(expected)}`,
      );
    }
  };

const checkWorkflows = (fail: Fail, event: WebhookEvent): void => {
  const hook = event.hook.value;
  const configured = Arr.isReadonlyArrayNonEmpty(event.workflows);
  if (hook === WORKFLOW_RUN && !configured) {
    fail(event, 'no workflow is configured for "workflow_run" event');
  }
  if (hook !== WORKFLOW_RUN && configured) {
    fail(
      event,
      `"workflows" cannot be configured for ${quote(hook)} event. it is only for workflow_run event`,
    );
  }
};

const checkFilters = (fail: Fail, event: WebhookEvent): void => {
  const check = checkExclusive({ fail, hook: event.hook.value });
  check({
    filter: event.paths,
    ignore: event.pathsIgnore,
    available: ["push", "pull_request", "pull_request_target"],
  });
  check({
    filter: event.branches,
    ignore: event.branchesIgnore,
    available: ["merge_group", "push", "pull_request", "pull_request_target", WORKFLOW_RUN],
  });
  check({ filter: event.tags, ignore: event.tagsIgnore, available: ["push"] });
};

export const checkWebhook =
  (fail: Fail) =>
  (event: WebhookEvent): void => {
    const types = Rec.get(WEBHOOKS, event.hook.value);
    if (Option.isNone(types)) {
      fail(
        event,
        `unknown Webhook event ${quote(event.hook.value)}. see ${UNKNOWN_DOCS} for list of all Webhook event names`,
      );
      return;
    }
    if (typeof types.value !== "string") {
      checkTypes(fail, event)(types.value);
    }
    checkWorkflows(fail, event);
    checkFilters(fail, event);
  };
