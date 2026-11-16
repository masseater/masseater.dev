import { Array as Arr, Effect } from "effect";

import { checkCommandEntries } from "./command-entries.ts";
import { checkCrates } from "./crates.ts";
import { checkFallowEntries } from "./fallow-entries.ts";
import { checkHiddenVerify } from "./hidden-verify.ts";
import { checkRootWorkspacePaths } from "./root-workspace-paths.ts";
import { checkSharedUncachedTasks } from "./shared-uncached-tasks.ts";
import { checkWorkflowPaths } from "./workflow-paths.ts";
import { checkWorkflowScale } from "./workflow-scale.ts";

/** @internal */
export const checkWorkspaces = Effect.fn("checkWorkspaces")(function* checkWorkspaces(
  root: string,
) {
  const found = yield* Effect.all(
    [
      checkCommandEntries(root),
      checkCrates(root),
      checkFallowEntries(root),
      checkHiddenVerify(root),
      checkRootWorkspacePaths(root),
      checkSharedUncachedTasks(root),
      checkWorkflowPaths(root),
      checkWorkflowScale(root),
    ],
    {
      concurrency: "unbounded",
    },
  );
  return Arr.flatten(found);
});
