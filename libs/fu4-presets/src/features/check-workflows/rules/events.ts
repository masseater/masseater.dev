import type { Event } from "#/entities/workflow/index.ts";
import { checkCallDefaults } from "#/features/check-workflows/lib/events/call.ts";
import { checkDispatch } from "#/features/check-workflows/lib/events/dispatch.ts";
import { checkSchedule } from "#/features/check-workflows/lib/events/schedule.ts";
import { checkWebhook } from "#/features/check-workflows/lib/events/webhook.ts";
import { NOOP, eachEvent, workflowRule } from "#/features/check-workflows/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/check-workflows/lib/workflow-rule.ts";

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
    workflowPre: eachEvent(checkEvent(fail)),
  }),
});
