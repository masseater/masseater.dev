import { Array as Arr, Effect } from "effect";

import { checkMarkdown } from "#/features/check-markdown/index.ts";
import { checkOverrides } from "#/features/check-overrides/index.ts";
import { checkPlacement } from "#/features/check-placement/index.ts";
import { checkWorkspaces } from "#/features/check-repository-layout/index.ts";
import { checkTypescriptGeneration } from "#/features/check-typescript-generation/index.ts";
import { checkPublishedPackages } from "#/features/measure-install-size/index.ts";
import type { Problem } from "#/shared/lib/problem.ts";

import { checkSources } from "./source-checks.ts";
import { checkToolUse } from "./tool-use.ts";
import { checkTrackedText } from "./tracked-text.ts";

/** @internal */
export const checkAll: (
  root: string,
) => Effect.Effect<
  readonly Problem[],
  Effect.Error<
    | ReturnType<typeof checkSources>
    | ReturnType<typeof checkOverrides>
    | ReturnType<typeof checkTrackedText>
    | ReturnType<typeof checkWorkspaces>
    | ReturnType<typeof checkToolUse>
  >,
  Effect.Services<
    | ReturnType<typeof checkSources>
    | ReturnType<typeof checkOverrides>
    | ReturnType<typeof checkTrackedText>
  >
> = Effect.fn("checkAll")(function* checkAll(root: string) {
  const found = yield* Effect.all(
    [
      checkSources(root),
      checkOverrides(root),
      checkTrackedText(root),
      checkPlacement(root),
      checkPublishedPackages(root),
      checkWorkspaces(root),
      checkToolUse(root),
      checkMarkdown(root),
      checkTypescriptGeneration(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
