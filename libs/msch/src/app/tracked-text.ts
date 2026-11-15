import { Array as Arr, Effect } from "effect";

import { checkComments } from "#/features/comments/index.ts";
import { checkGitSubpath } from "#/features/git-subpath/index.ts";
import { checkHiddenUnicode } from "#/features/invisible-characters/index.ts";
import { checkPython } from "#/features/python/index.ts";
import { checkUnneededFiles } from "#/features/unneeded-files/index.ts";
import { checkWorkflowQueues } from "#/features/workflow-concurrency/index.ts";

/** @internal */
export const checkTrackedText = Effect.fn("checkTrackedText")(function* checkTrackedText(
  root: string,
) {
  const found = yield* Effect.all(
    [
      checkHiddenUnicode(root),
      checkPython(root),
      checkUnneededFiles(root),
      checkComments(root),
      checkGitSubpath(root),
      checkWorkflowQueues(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
