import { Array as Arr, Effect } from "effect";

import { checkPublishedPackages } from "#/features/install-size/index.ts";
import { checkOverrides } from "#/features/overrides/index.ts";
import { passThroughWrappersIn } from "#/features/pass-through-wrappers/index.ts";
import { checkPlacement } from "#/features/placement/index.ts";
import { checkWorkspaces } from "#/features/repository-layout/index.ts";
import { checkRepository } from "#/features/value-owners/index.ts";
import type { Problem } from "#/shared/lib/problem.ts";

import { checkToolUse } from "./tool-use.ts";
import { checkTrackedText } from "./tracked-text.ts";

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
    | ReturnType<typeof checkToolUse>
  >,
  Effect.Services<
    | ReturnType<typeof checkRepository>
    | ReturnType<typeof checkOverrides>
    | ReturnType<typeof checkTrackedText>
  >
> = Effect.fn("checkAll")(function* checkAll(root: string) {
  const found = yield* Effect.all(
    [
      checkRepository(root, [passThroughWrappersIn]),
      checkOverrides(root),
      checkTrackedText(root),
      checkPlacement(root),
      checkPublishedPackages(root),
      checkWorkspaces(root),
      checkToolUse(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
