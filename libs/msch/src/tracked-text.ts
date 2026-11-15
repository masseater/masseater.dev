import { Array as Arr, Effect } from "effect";

import { checkComments } from "./comments.ts";
import { checkHiddenUnicode } from "./hidden-unicode.ts";
import { checkPython } from "./python.ts";
import { checkUnneededFiles } from "./unneeded-files.ts";

/** @internal */
const checkTrackedText = Effect.fn("checkTrackedText")(function* checkTrackedText(root: string) {
  const found = yield* Effect.all(
    [checkHiddenUnicode(root), checkPython(root), checkUnneededFiles(root), checkComments(root)],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});

export { checkTrackedText };
