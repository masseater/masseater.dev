import { Array as Arr, Effect } from "effect";

import { checkCrates } from "./crates.ts";
import { checkRootWorkspacePaths } from "./root-workspace-paths.ts";

/** @internal */
const checkWorkspaces = Effect.fn("checkWorkspaces")(function* checkWorkspaces(root: string) {
  const found = yield* Effect.all([checkCrates(root), checkRootWorkspacePaths(root)], {
    concurrency: "unbounded",
  });
  return Arr.flatten(found);
});

export { checkWorkspaces };
