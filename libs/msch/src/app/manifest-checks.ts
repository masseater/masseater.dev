import { Array as Arr, Effect } from "effect";

import { checkPublishedPackages } from "#/features/install-size/index.ts";
import { checkOverrides } from "#/features/overrides/index.ts";
import { checkScripts } from "#/features/scripts/index.ts";
import type { Problem } from "#/shared/lib/problem.ts";

/** @internal */
export const checkManifests: (
  root: string,
) => Effect.Effect<
  readonly Problem[],
  Effect.Error<ReturnType<typeof checkOverrides> | ReturnType<typeof checkScripts>>,
  Effect.Services<ReturnType<typeof checkOverrides> | ReturnType<typeof checkScripts>>
> = Effect.fn("checkManifests")(function* checkManifests(root: string) {
  const found = yield* Effect.all(
    [checkOverrides(root), checkScripts(root), checkPublishedPackages(root)],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
