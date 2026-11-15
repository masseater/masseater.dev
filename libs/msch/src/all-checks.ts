import { Array as Arr, Effect } from "effect";

import { checkRepository } from "./check.ts";
import { checkPublishedPackages } from "./install-size.ts";
import { checkNestedDocs } from "./nested-docs.ts";
import { checkOverrides } from "./overrides.ts";
import type { Problem } from "./problem.ts";
import { checkRootReadme } from "./root-readme.ts";
import { checkTrackedText } from "./tracked-text.ts";
import { checkWorkspaces } from "./workspace-checks.ts";

/** @internal */
const checkAll: (
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
      checkNestedDocs(root),
      checkRootReadme(root),
      checkPublishedPackages(root),
      checkWorkspaces(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});

export { checkAll };
