import { Effect, Option, Result, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { fileProblem } from "./member-sources.ts";

const README_FILE = "README.md";

interface Readme {
  readonly file: string;
  readonly source: string;
}

export const readReadme = Effect.fn("readReadme")(function* readReadme({
  root,
  directory,
  rule,
  missingMessage,
}: Readonly<{ root: string; directory: string; rule: RuleName; missingMessage: string }>) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, directory, README_FILE);
  const text = yield* files.readFile(file);
  return pipe(
    text,
    Option.match({
      onNone: (): Result.Result<Readme, Problem> =>
        Result.fail(fileProblem({ file, rule, message: missingMessage })),
      onSome: (source): Result.Result<Readme, Problem> => Result.succeed({ file, source }),
    }),
  );
});
