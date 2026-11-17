import { Array as Arr, Effect } from "effect";

import { checkComments } from "#/features/ban-comments/index.ts";
import { checkDocker, checkPython } from "#/features/ban-tools/index.ts";
import { checkCatalogEntries } from "#/features/check-catalog-entries/index.ts";
import { checkGitSubpath, checkPackageRegistry } from "#/features/check-overrides/index.ts";
import { checkNodeVersion } from "#/features/check-runtime-version/index.ts";
import {
  checkPublishedSkills,
  checkSkillEntry,
  checkSkillFiles,
} from "#/features/check-skills/index.ts";
import {
  checkDowngrades,
  checkRenovateSettings,
} from "#/features/check-version-downgrades/index.ts";
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
      checkDowngrades(root),
      checkRenovateSettings(root),
      checkCatalogEntries(root),
      checkPackageRegistry(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
