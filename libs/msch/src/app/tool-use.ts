import { Array as Arr, Effect } from "effect";

import { checkMissingHooks } from "#/features/agent-settings/index.ts";
import { checkAlchemyPatch } from "#/features/patches/index.ts";
import { checkVitePlus } from "#/features/vite-plus/index.ts";

/** @internal */
export const checkToolUse = Effect.fn("checkToolUse")(function* checkToolUse(root: string) {
  const found = yield* Effect.all(
    [checkVitePlus(root), checkMissingHooks(root), checkAlchemyPatch(root)],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
