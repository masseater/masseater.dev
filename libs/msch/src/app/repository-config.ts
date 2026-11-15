import { Array as Arr, Effect } from "effect";

import { checkPublishedPackages } from "#/features/install-size/index.ts";
import { checkPlacement } from "#/features/placement/index.ts";
import { checkWorkspaces } from "#/features/repository-layout/index.ts";
import { checkScripts } from "#/features/scripts/index.ts";
import { checkWorkflowQueues } from "#/features/workflow-concurrency/index.ts";

/** @internal */
export const checkRepositoryConfig = Effect.fn("checkRepositoryConfig")(
  function* checkRepositoryConfig(root: string) {
    const found = yield* Effect.all(
      [
        checkPlacement(root),
        checkScripts(root),
        checkPublishedPackages(root),
        checkWorkspaces(root),
        checkWorkflowQueues(root),
      ],
      { concurrency: "unbounded" },
    );
    return Arr.flatten(found);
  },
);
