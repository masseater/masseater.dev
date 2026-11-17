import { Array as Arr, Effect } from "effect";

import { checkPackageScope } from "#/features/check-package-scope/index.ts";
import { checkNodeVersion } from "#/features/check-runtime-version/index.ts";

/** @internal */
export const checkManifests = Effect.fn("checkManifests")(function* checkManifests(root: string) {
  const found = yield* Effect.all([checkNodeVersion(root), checkPackageScope(root)], {
    concurrency: "unbounded",
  });
  return Arr.flatten(found);
});
