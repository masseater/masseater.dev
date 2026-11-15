import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { namedWorkspaces } from "#/entities/workspace/index.ts";
import type { NamedWorkspace } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "root-readme";
const ROOT_DOC = /^(?:README(?:\.[^/]+)?|AGENTS\.md|CLAUDE\.md)$/iu;
const READ_CONCURRENCY = 16;
const START = 0;

const messageFor = (directory: string): string =>
  `names the workspace ${directory}. The root README, AGENTS.md and CLAUDE.md describe the repository as a whole. Write what belongs to the workspace in ${directory}/README.md, or for agents in ${directory}/AGENTS.md.`;

const problemsIn =
  (file: string, source: string) =>
  ({ directory, pattern }: NamedWorkspace): readonly Problem[] => {
    const message = messageFor(directory);
    const at = positionOf(source);
    return pipe(
      Arr.fromIterable(Str.matchAll(pattern)(source)),
      Arr.map((found) => ({ file, ...at(found.index ?? START), rule: RULE, message })),
    );
  };

const problemsInReadme = Effect.fn("problemsInReadme")(function* problemsInReadme(
  file: string,
  workspaces: readonly NamedWorkspace[],
) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(file);
  return pipe(
    text,
    Option.match({
      onNone: (): readonly Problem[] => [],
      onSome: (source) => pipe(workspaces, Arr.flatMap(problemsIn(file, source))),
    }),
  );
});

/** @internal */
export const checkRootReadme = Effect.fn("checkRootReadme")(function* checkRootReadme(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const readmes = pipe(
    names,
    Arr.filter((name) => ROOT_DOC.test(name)),
  );
  const workspaces = yield* namedWorkspaces(root);
  const found = yield* Effect.forEach(
    readmes,
    (name) => problemsInReadme(files.join(root, name), workspaces),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});
