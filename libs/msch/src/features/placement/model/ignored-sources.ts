import { Array as Arr, Effect, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "ignored-sources";
const SOURCES = [":(glob)**/src/**", ":(exclude,glob)**/node_modules/**"];
const FIRST = 1;
const MESSAGE =
  "is under src/ but .gitignore ignores it, so verify passes here while the file never reaches the commit. Narrow the pattern in .gitignore.";

/** @internal */
export const checkIgnoredSources = Effect.fn("checkIgnoredSources")(function* checkIgnoredSources(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const ignored = yield* files.ignoredFiles(root, SOURCES);
  return pipe(
    ignored,
    Arr.map((file): Problem => ({
      file: files.join(root, file),
      line: FIRST,
      column: FIRST,
      rule: RULE,
      message: MESSAGE,
    })),
  );
});
