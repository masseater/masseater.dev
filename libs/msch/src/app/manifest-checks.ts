import { Array as Arr, Effect } from "effect";

import { checkPublishedPackages } from "#/features/install-size/index.ts";
import { checkOverrides } from "#/features/overrides/index.ts";
import { checkScripts } from "#/features/scripts/index.ts";

/** @internal */
export const checkManifests = Effect.fn("checkManifests")(function* checkManifests(root: string) {
  const found = yield* Effect.all(
    [checkOverrides(root), checkScripts(root), checkPublishedPackages(root)],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
