import { Array as Arr, Effect } from "effect";

import { checkRepository } from "./check.ts";
import { checkPublishedPackages } from "./install-size.ts";
import { checkOverrides } from "./overrides.ts";
import { checkPlacement } from "./placement-checks.ts";
import type { Problem } from "./problem.ts";
import { checkTrackedText } from "./tracked-text.ts";
import { checkWorkspaces } from "./workspace-checks.ts";

/** @internal */
export const checkAll: (
  root: string,
) => Effect.Effect<
  readonly Problem[],
  Effect.Error<
    | ReturnType<typeof checkRepository>
    | ReturnType<typeof checkOverrides>
    | ReturnType<typeof checkTrackedText>
    | ReturnType<typeof checkWorkspaces>
  >,
  Effect.Services<
    | ReturnType<typeof checkRepository>
    | ReturnType<typeof checkOverrides>
    | ReturnType<typeof checkTrackedText>
  >
> = Effect.fn("checkAll")(function* checkAll(root: string) {
  const found = yield* Effect.all(
    [
      checkRepository(root),
      checkOverrides(root),
      checkTrackedText(root),
      checkPlacement(root),
      checkPublishedPackages(root),
      checkWorkspaces(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
