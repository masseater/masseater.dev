import { Array as Arr, Effect } from "effect";

import { checkAgentDocsLength } from "./agent-docs-length.ts";
import { checkColocatedTests } from "./colocated-tests.ts";
import { checkDanglingLinks } from "./dangling-links.ts";
import { checkLayeredSource } from "./layered-source.ts";
import { checkNestedDocs } from "./nested-docs.ts";
import { checkRootDocs } from "./root-docs.ts";
import { checkRootReadme } from "./root-readme.ts";
import { checkSourceAliases } from "./source-aliases.ts";

/** @internal */
export const checkPlacement = Effect.fn("checkPlacement")(function* checkPlacement(root: string) {
  const found = yield* Effect.all(
    [
      checkNestedDocs(root),
      checkRootReadme(root),
      checkRootDocs(root),
      checkColocatedTests(root),
      checkAgentDocsLength(root),
      checkLayeredSource(root),
      checkDanglingLinks(root),
      checkSourceAliases(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
