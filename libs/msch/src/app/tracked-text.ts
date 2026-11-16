import { Array as Arr, Effect } from "effect";

import { checkComments } from "#/features/comments/index.ts";
import { checkHiddenUnicode } from "#/features/invisible-characters/index.ts";
import { checkPython } from "#/features/python/index.ts";
import { checkNodeVersion } from "#/features/runtime-version/index.ts";
import { checkSkillEntry, checkSkillFiles } from "#/features/skills/index.ts";
import {
  checkAlchemyPatch,
  checkAppliedPackages,
  checkReplacedTools,
  checkUnneededFiles,
} from "#/features/unneeded-files/index.ts";

/** @internal */
export const checkTrackedText = Effect.fn("checkTrackedText")(function* checkTrackedText(
  root: string,
) {
  const found = yield* Effect.all(
    [
      checkHiddenUnicode(root),
      checkPython(root),
      checkUnneededFiles(root),
      checkReplacedTools(root),
      checkAlchemyPatch(root),
      checkNodeVersion(root),
      checkSkillFiles(root),
      checkSkillEntry(root),
      checkComments(root),
      checkAppliedPackages(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
