import { Option } from "effect";

import type { Event } from "#/entities/workflow/model/types.ts";
import { checkCallDefaults } from "#/features/actionlint/lib/events/call.ts";
import { checkDispatch } from "#/features/actionlint/lib/events/dispatch.ts";
import { checkSchedule } from "#/features/actionlint/lib/events/schedule.ts";
import { checkWebhook } from "#/features/actionlint/lib/events/webhook.ts";
import { NOOP, workflowRule } from "#/features/actionlint/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/actionlint/lib/workflow-rule.ts";

const checkEvent =
  (fail: Fail) =>
  (event: Event): void => {
    if (event.type === "schedule") {
      checkSchedule(fail)(event);
    }
    if (event.type === "workflow_dispatch") {
      checkDispatch(fail)(event);
    }
    if (event.type === "workflow_call") {
      checkCallDefaults(fail)(event);
    }
    if (event.type === "webhook") {
      checkWebhook(fail)(event);
    }
  };

export const events = workflowRule({
  description: "Reports invalid triggers, filters, schedules and inputs in the on section",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-unknown-webhook-event-and-activity-types",
  visitor: (fail): Visitor => ({
    ...NOOP,
    workflowPre: (workflow) => {
      for (const event of Option.getOrElse(Option.fromNullishOr(workflow.on), () => [])) {
        checkEvent(fail)(event);
      }
    },
  }),
});
