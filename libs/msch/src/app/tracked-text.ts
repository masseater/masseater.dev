import { Array as Arr, Effect } from "effect";

import { checkComments } from "#/features/ban-comments/index.ts";
import { checkDocker, checkPython } from "#/features/ban-tools/index.ts";
import { checkGitSubpath } from "#/features/check-overrides/index.ts";
import { checkNodeVersion } from "#/features/check-runtime-version/index.ts";
import {
  checkPublishedSkills,
  checkSkillEntry,
  checkSkillFiles,
} from "#/features/check-skills/index.ts";
import { checkHiddenUnicode } from "#/features/find-invisible-characters/index.ts";
import {
  checkAlchemyPatch,
  checkAppliedPackages,
  checkReplacedTools,
  checkUnneededFiles,
} from "#/features/find-unneeded-files/index.ts";

/** @internal */
export const checkTrackedText = Effect.fn("checkTrackedText")(function* checkTrackedText(
  root: string,
) {
  const found = yield* Effect.all(
    [
      checkHiddenUnicode(root),
      checkPython(root),
      checkDocker(root),
      checkUnneededFiles(root),
      checkReplacedTools(root),
      checkAlchemyPatch(root),
      checkNodeVersion(root),
      checkSkillFiles(root),
      checkSkillEntry(root),
      checkPublishedSkills(root),
      checkComments(root),
      checkAppliedPackages(root),
      checkGitSubpath(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
