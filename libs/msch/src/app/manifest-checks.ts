import { Array as Arr, Effect } from "effect";

import { checkEffectDiagnostics } from "#/features/check-effect-diagnostics/index.ts";
import { checkExactVersions } from "#/features/check-exact-versions/index.ts";
import { checkPackSettings } from "#/features/check-pack-settings/index.ts";
import { checkPackageScope } from "#/features/check-package-scope/index.ts";
import { checkPluginMarketplace } from "#/features/check-plugin-marketplace/index.ts";
import { checkNodeVersion } from "#/features/check-runtime-version/index.ts";
import { checkUnusedWorkspaces } from "#/features/check-unused-workspaces/index.ts";
import {
  checkScatteredDeviations,
  checkUpstreamExits,
} from "#/features/check-upstream-exits/index.ts";
import { checkWorkspaceDescriptions } from "#/features/check-workspace-descriptions/index.ts";

/** @internal */
export const checkManifests = Effect.fn("checkManifests")(function* checkManifests(root: string) {
  const found = yield* Effect.all(
    [
      checkNodeVersion(root),
      checkPackageScope(root),
      checkPackSettings(root),
      checkUnusedWorkspaces(root),
      checkExactVersions(root),
      checkUpstreamExits(root),
      checkScatteredDeviations(root),
      checkEffectDiagnostics(root),
      checkWorkspaceDescriptions(root),
      checkPluginMarketplace(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
