import { Array as Arr, Effect } from "effect";

import { checkDocker, checkPython } from "#/features/banned-tools/index.ts";
import { checkComments } from "#/features/comments/index.ts";
import { checkHiddenUnicode } from "#/features/invisible-characters/index.ts";
import { checkGitSubpath } from "#/features/overrides/index.ts";
import { checkNodeVersion } from "#/features/runtime-version/index.ts";
import { checkPublishedSkills, checkSkillEntry, checkSkillFiles } from "#/features/skills/index.ts";
import {
  checkAlchemyPatch,
  checkAppliedPackages,
  checkReplacedTools,
  checkUnneededFiles,
} from "#/features/unneeded-files/index.ts";
import { checkCatalogEntries } from "#/features/versions/catalog-entries/index.ts";
import { checkDowngrades, checkRenovateSettings } from "#/features/versions/downgrade/index.ts";

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
      checkDowngrades(root),
      checkRenovateSettings(root),
      checkCatalogEntries(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
