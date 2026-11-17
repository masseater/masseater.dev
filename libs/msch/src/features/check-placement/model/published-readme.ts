import { Array as Arr, Effect, Option, pipe } from "effect";

import { publishedProjects } from "#/entities/workspace/index.ts";
import type { WorkspaceProject } from "#/entities/workspace/index.ts";
import { JAPANESE } from "#/shared/config/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "published-readme";
const README_FILE = "README.md";
const READ_CONCURRENCY = 16;
const MESSAGE =
  "contains Japanese. This package is published to npm, so write its README in English.";

const problemIn = Effect.fn("problemIn")(function* problemIn(
  root: string,
  { directory }: WorkspaceProject,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, directory, README_FILE);
  const text = yield* files.readFile(file);
  return pipe(
    text,
    Option.flatMap((source) =>
      pipe(
        Option.fromNullishOr(JAPANESE.exec(source)),
        Option.map((found): Problem => {
          const { line, column } = positionOf(source)(found.index);
          return { file, line, column, rule: RULE, message: MESSAGE };
        }),
      ),
    ),
  );
});

/** @internal */
export const checkPublishedReadme = Effect.fn("checkPublishedReadme")(
  function* checkPublishedReadme(root: string) {
    const projects = yield* publishedProjects(root);
    const found = yield* Effect.forEach(projects, (project) => problemIn(root, project), {
      concurrency: READ_CONCURRENCY,
    });
    return Arr.getSomes(found);
  },
);
