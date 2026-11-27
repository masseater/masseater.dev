import { Array as Arr, Effect, Option, Result, pipe } from "effect";

import { publishedProjects } from "#/entities/workspace/index.ts";
import type { WorkspaceProject } from "#/entities/workspace/index.ts";
import { JAPANESE } from "#/shared/config/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { readReadme } from "./readme-file.ts";

const RULE: RuleName = "published-readme";
const READ_CONCURRENCY = 16;
const MESSAGE =
  "contains Japanese. This package is published to npm, so write its README in English.";
const MISSING_MESSAGE =
  "is missing. This package is published to npm, so give it an English README.md.";

const problemIn = Effect.fn("problemIn")(function* problemIn(
  root: string,
  { directory }: WorkspaceProject,
) {
  const readme = yield* readReadme({
    root,
    directory,
    rule: RULE,
    missingMessage: MISSING_MESSAGE,
  });
  return Result.match(readme, {
    onFailure: Option.some,
    onSuccess: ({ file, source }) =>
      pipe(
        Option.fromNullishOr(JAPANESE.exec(source)),
        Option.map((found): Problem => {
          const { line, column } = positionOf(source)(found.index);
          return { file, line, column, rule: RULE, message: MESSAGE };
        }),
      ),
  });
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
