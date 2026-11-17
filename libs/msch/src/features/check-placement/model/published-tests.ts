import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { publishedProjects } from "#/entities/workspace/index.ts";
import type { WorkspaceProject } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "published-tests";
const MANIFEST_FILE = "package.json";
const FILE_START = 1;
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/u;
const MESSAGE =
  "belongs to a package published to npm that has no tests. Write tests for what the package offers before publishing it.";

const testedIn =
  (listed: readonly string[]) =>
  (prefix: string): boolean =>
    pipe(
      listed,
      Arr.some((file) => Str.startsWith(prefix)(file) && TEST_FILE.test(file)),
    );

const problemFor = Effect.fn("problemFor")(function* problemFor(
  root: string,
  listed: readonly string[],
  { directory }: WorkspaceProject,
) {
  const files = yield* RepositoryFiles;
  const absolute = files.join(root, directory);
  const prefix = `${absolute}/`;
  if (testedIn(listed)(prefix)) {
    return Option.none<Problem>();
  }
  return Option.some<Problem>({
    file: files.join(absolute, MANIFEST_FILE),
    line: FILE_START,
    column: FILE_START,
    rule: RULE,
    message: MESSAGE,
  });
});

/** @internal */
export const checkPublishedTests = Effect.fn("checkPublishedTests")(function* checkPublishedTests(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const projects = yield* publishedProjects(root);
  const listed = yield* files.listedFiles(root);
  const absolute = pipe(
    listed,
    Arr.map((file) => files.join(root, file)),
  );
  const found = yield* Effect.forEach(projects, (project) => problemFor(root, absolute, project), {
    concurrency: 1,
  });
  return Arr.getSomes(found);
});
