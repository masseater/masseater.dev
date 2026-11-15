import { Array as Arr, Effect } from "effect";

import { checkCrates } from "./crates.ts";
import { checkHiddenVerify } from "./hidden-verify.ts";
import { checkRootWorkspacePaths } from "./root-workspace-paths.ts";

/** @internal */
export const checkWorkspaces = Effect.fn("checkWorkspaces")(function* checkWorkspaces(
  root: string,
) {
  const found = yield* Effect.all(
    [checkCrates(root), checkHiddenVerify(root), checkRootWorkspacePaths(root)],
    {
      concurrency: "unbounded",
    },
  );
  return Arr.flatten(found);
});
