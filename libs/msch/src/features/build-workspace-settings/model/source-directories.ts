import { Array as Arr, Effect, Option, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { collectIgnoredDirectories } from "./ignored-directories.ts";

const SOURCE_DIRECTORY = "src";
const READ_CONCURRENCY = 16;

export const directoryLayoutIn = Effect.fn("directoryLayoutIn")(function* directoryLayoutIn(
  root: string,
  directories: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const listed = yield* Effect.forEach(
    directories,
    (directory) => {
      const source = files.join(directory, SOURCE_DIRECTORY);
      return files
        .isDirectory(files.join(root, source))
        .pipe(
          Effect.map((isDirectory) => pipe(isDirectory, Option.filter(Boolean), Option.as(source))),
        );
    },
    { concurrency: READ_CONCURRENCY },
  );
  return {
    sourceDirectories: Arr.getSomes(listed),
    ignoredDirectories: yield* collectIgnoredDirectories(root),
  };
});
