import { Array as Arr, Effect } from "effect";

import { checkMissingHooks } from "#/features/check-agent-settings/index.ts";
import { checkRestrictedRules } from "#/features/check-overrides/index.ts";
import { checkScripts } from "#/features/check-scripts/index.ts";
import { checkVitePlus } from "#/features/check-vite-plus/index.ts";
import { checkFullHistoryCheckout, checkWorkflowQueues } from "#/features/check-workflows/index.ts";

/** @internal */
export const checkToolUse = Effect.fn("checkToolUse")(function* checkToolUse(root: string) {
  const found = yield* Effect.all(
    [
      checkVitePlus(root),
      checkMissingHooks(root),
      checkScripts(root),
      checkWorkflowQueues(root),
      checkFullHistoryCheckout(root),
      checkRestrictedRules(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
