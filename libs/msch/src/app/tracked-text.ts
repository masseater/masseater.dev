import { Array as Arr, Effect } from "effect";

import { checkComments } from "#/features/comments/index.ts";
import { checkHiddenUnicode } from "#/features/invisible-characters/index.ts";
import { checkPython } from "#/features/python/index.ts";

/** @internal */
export const checkTrackedText = Effect.fn("checkTrackedText")(function* checkTrackedText(
  root: string,
) {
  const found = yield* Effect.all(
    [checkHiddenUnicode(root), checkPython(root), checkComments(root)],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
