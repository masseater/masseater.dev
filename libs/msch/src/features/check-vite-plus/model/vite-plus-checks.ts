import { Effect } from "effect";

import { commandProblems } from "./command-problems.ts";
import { commandSources } from "./command-sources.ts";
import { packageScriptProblems } from "./package-scripts.ts";
import { checkVitePlusBlock } from "./vite-plus-block.ts";

/** @internal */
export const checkVitePlus = Effect.fn("checkVitePlus")(function* checkVitePlus(root: string) {
  const [sources, blocks] = yield* Effect.all([commandSources(root), checkVitePlusBlock(root)], {
    concurrency: "unbounded",
  });
  return [...packageScriptProblems(sources), ...commandProblems(sources), ...blocks];
});
