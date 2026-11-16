import { Array as Arr, Effect } from "effect";

import { checkMissingHooks } from "#/features/agent-settings/index.ts";
import { checkRestrictedRules } from "#/features/overrides/index.ts";
import { checkScripts } from "#/features/scripts/index.ts";
import { checkVitePlus } from "#/features/vite-plus/index.ts";
import { checkWorkflowCommits } from "#/features/workflows/commits/index.ts";
import { checkWorkflowQueues } from "#/features/workflows/concurrency/index.ts";

/** @internal */
export const checkToolUse = Effect.fn("checkToolUse")(function* checkToolUse(root: string) {
  const found = yield* Effect.all(
    [
      checkVitePlus(root),
      checkMissingHooks(root),
      checkScripts(root),
      checkWorkflowQueues(root),
      checkWorkflowCommits(root),
      checkRestrictedRules(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
