import { Array as Arr, Effect } from "effect";

import { checkColocatedTests } from "./colocated-tests.ts";
import { checkNestedDocs } from "./nested-docs.ts";
import { checkRootReadme } from "./root-readme.ts";

/** @internal */
const checkPlacement = Effect.fn("checkPlacement")(function* checkPlacement(root: string) {
  const found = yield* Effect.all(
    [checkNestedDocs(root), checkRootReadme(root), checkColocatedTests(root)],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});

export { checkPlacement };
