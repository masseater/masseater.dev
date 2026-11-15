import { Array as Arr, Effect } from "effect";

import { checkCrates } from "./crates.ts";
import { checkHiddenVerify } from "./hidden-verify.ts";
import { checkRootWorkspacePaths } from "./root-workspace-paths.ts";
import { checkSharedUncachedTasks } from "./shared-uncached-tasks.ts";
import { checkWorkflowPaths } from "./workflow-paths.ts";

/** @internal */
export const checkWorkspaces = Effect.fn("checkWorkspaces")(function* checkWorkspaces(
  root: string,
) {
  const found = yield* Effect.all(
    [
      checkCrates(root),
      checkHiddenVerify(root),
      checkRootWorkspacePaths(root),
      checkSharedUncachedTasks(root),
      checkWorkflowPaths(root),
    ],
    {
      concurrency: "unbounded",
    },
  );
  return Arr.flatten(found);
});
