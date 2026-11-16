import { Array as Arr, Effect } from "effect";

import { checkAgentDocsLength } from "./agent-docs-length.ts";
import { checkDanglingLinks } from "./dangling-links.ts";
import { checkNestedDocs } from "./nested-docs.ts";
import { checkRootDocs } from "./root-docs.ts";
import { checkRootReadme } from "./root-readme.ts";

/** @internal */
export const checkDocPlacement = Effect.fn("checkDocPlacement")(function* checkDocPlacement(
  root: string,
) {
  const found = yield* Effect.all(
    [
      checkNestedDocs(root),
      checkRootReadme(root),
      checkRootDocs(root),
      checkAgentDocsLength(root),
      checkDanglingLinks(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
