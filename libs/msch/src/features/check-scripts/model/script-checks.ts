import { Array as Arr, Effect } from "effect";

import { checkShellScripts } from "./shell-scripts.ts";
import { checkWorkflows } from "./workflows.ts";

/** @internal */
export const checkScripts = Effect.fn("checkScripts")(function* checkScripts(root: string) {
  const found = yield* Effect.all([checkShellScripts(root), checkWorkflows(root)], {
    concurrency: "unbounded",
  });
  return Arr.flatten(found);
});
