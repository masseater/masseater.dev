import { Array as Arr, Effect } from "effect";

import { checkKnownPlugins, checkMissingHooks } from "#/features/check-agent-settings/index.ts";
import { checkDocumentedCommands } from "#/features/check-documented-commands/index.ts";
import { checkLegacyWeb } from "#/features/check-legacy-web/index.ts";
import { checkMarkdown } from "#/features/check-markdown/index.ts";
import { checkRestrictedRules } from "#/features/check-overrides/index.ts";
import { checkScripts } from "#/features/check-scripts/index.ts";
import { checkStructure } from "#/features/check-structure/index.ts";
import { checkVitePlus } from "#/features/check-vite-plus/index.ts";
import {
  checkFullHistoryCheckout,
  checkPublishTrigger,
  checkReleasePlease,
  checkWorkflowCommits,
  checkWorkflowLint,
  checkWorkflowQueues,
} from "#/features/check-workflows/index.ts";

/** @internal */
export const checkToolUse = Effect.fn("checkToolUse")(function* checkToolUse(root: string) {
  const found = yield* Effect.all(
    [
      checkVitePlus(root),
      checkMissingHooks(root),
      checkKnownPlugins(root),
      checkScripts(root),
      checkWorkflowQueues(root),
      checkWorkflowCommits(root),
      checkFullHistoryCheckout(root),
      checkReleasePlease(root),
      checkPublishTrigger(root),
      checkRestrictedRules(root),
      checkMarkdown(root),
      checkLegacyWeb(root),
      checkDocumentedCommands(root),
      checkStructure(root),
      checkWorkflowLint(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
