import { Array as Arr, Effect } from "effect";

import { checkHiddenVerify } from "./hidden-verify.ts";
import { checkSharedUncachedTasks } from "./shared-uncached-tasks.ts";
import { checkUnlockedTasks } from "./unlocked-tasks.ts";

/** @internal */
export const checkTasks = Effect.fn("checkTasks")(function* checkTasks(root: string) {
  const found = yield* Effect.all(
    [checkHiddenVerify(root), checkSharedUncachedTasks(root), checkUnlockedTasks(root)],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
