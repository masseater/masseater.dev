import { Array as Arr, Effect } from "effect";

import { passThroughWrappersIn } from "#/features/pass-through-wrappers/index.ts";
import { checkPlacement } from "#/features/placement/index.ts";
import { checkWorkspaces } from "#/features/repository-layout/index.ts";
import { checkRepository } from "#/features/value-owners/index.ts";
import { checkWorkflowQueues } from "#/features/workflow-concurrency/index.ts";
import type { Problem } from "#/shared/lib/problem.ts";

import { checkManifests } from "./manifest-checks.ts";
import { checkTrackedText } from "./tracked-text.ts";

/** @internal */
export const checkAll: (
  root: string,
) => Effect.Effect<
  readonly Problem[],
  Effect.Error<
    | ReturnType<typeof checkRepository>
    | ReturnType<typeof checkManifests>
    | ReturnType<typeof checkTrackedText>
    | ReturnType<typeof checkWorkspaces>
  >,
  Effect.Services<
    | ReturnType<typeof checkRepository>
    | ReturnType<typeof checkManifests>
    | ReturnType<typeof checkTrackedText>
  >
> = Effect.fn("checkAll")(function* checkAll(root: string) {
  const found = yield* Effect.all(
    [
      checkRepository(root, [passThroughWrappersIn]),
      checkManifests(root),
      checkTrackedText(root),
      checkPlacement(root),
      checkWorkspaces(root),
      checkWorkflowQueues(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
