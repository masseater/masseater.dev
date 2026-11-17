import { Array as Arr, Effect, Option, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { collectIgnoredDirectories } from "./ignored-directories.ts";

const SOURCE_DIRECTORY = "src";
const RUST_MANIFEST = "Cargo.toml";
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
      return Effect.all([
        files.isDirectory(files.join(root, source)),
        files.exists(files.join(root, directory, RUST_MANIFEST)),
      ]).pipe(
        Effect.map(([isDirectory, isRust]) =>
          pipe(
            isDirectory,
            Option.filter((found) => found && !isRust),
            Option.as(source),
          ),
        ),
      );
    },
    { concurrency: READ_CONCURRENCY },
  );
  return {
    sourceDirectories: Arr.getSomes(listed),
    ignoredDirectories: yield* collectIgnoredDirectories(root),
  };
});
