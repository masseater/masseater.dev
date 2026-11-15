import { Array as Arr, Effect } from "effect";

import { checkMissingHooks } from "#/features/agent-settings/index.ts";
import { checkAlchemyPatch } from "#/features/patches/index.ts";
import { checkScripts } from "#/features/scripts/index.ts";
import { checkVitePlus } from "#/features/vite-plus/index.ts";
import { checkWorkflowQueues } from "#/features/workflow-concurrency/index.ts";

/** @internal */
export const checkToolUse = Effect.fn("checkToolUse")(function* checkToolUse(root: string) {
  const found = yield* Effect.all(
    [
      checkVitePlus(root),
      checkMissingHooks(root),
      checkAlchemyPatch(root),
      checkScripts(root),
      checkWorkflowQueues(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
