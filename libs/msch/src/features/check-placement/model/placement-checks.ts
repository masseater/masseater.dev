import { Array as Arr, Effect } from "effect";

import { checkColocatedGitPatterns } from "./colocated-git-patterns.ts";
import { checkColocatedTests } from "./colocated-tests.ts";
import { checkDocPlacement } from "./doc-placement.ts";
import { checkIgnoredSources } from "./ignored-sources.ts";
import { checkLayeredSource } from "./layered-source.ts";
import { checkSourceAliases } from "./source-aliases.ts";
import { checkSourceNames } from "./source-names.ts";

/** @internal */
export const checkPlacement = Effect.fn("checkPlacement")(function* checkPlacement(root: string) {
  const found = yield* Effect.all(
    [
      checkDocPlacement(root),
      checkColocatedTests(root),
      checkLayeredSource(root),
      checkSourceAliases(root),
      checkSourceNames(root),
      checkColocatedGitPatterns(root),
      checkIgnoredSources(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
