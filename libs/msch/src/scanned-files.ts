import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Problem } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";

const SCANNED_FILE =
  /(?:\.(?:[cm]?[jt]sx?|jsonc?|toml|ya?ml|sh|bash|zsh|fish|rs|cs|go|mk)|(?:^|\/)(?:Dockerfile[^/]*|Makefile|justfile|\.tool-versions|[^./][^./]*))$/u;

const LOCKFILE = /(?:^|\/)(?:[^/]*\.lock|[^/]*-lock\.(?:json|ya?ml))$/u;

const TOOL_VERSIONS = /(?:^|\/)(?:\.?mise(?:\.[^/]+)?\.toml|\.tool-versions)$/u;

const READ_CONCURRENCY = 64;

export interface Listed {
  readonly name: string;
  readonly file: string;
}

export const isScannedText = ({ name }: Listed): boolean =>
  SCANNED_FILE.test(name) && !LOCKFILE.test(name);

export const isToolVersions = ({ name }: Listed): boolean => TOOL_VERSIONS.test(name);

/** @internal */
export const listedFiles = Effect.fn("listedFiles")(function* listedFiles(root: string) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  return pipe(
    names,
    Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
  );
});

/** @internal */
export const presentFiles = Effect.fn("presentFiles")(function* presentFiles(listed: readonly Listed[]) {
  const files = yield* RepositoryFiles;
  return yield* pipe(
    listed,
    Effect.filter(({ file }) => files.exists(file)),
  );
});

/** @internal */
export const scanText = Effect.fn("scanText")(function* scanText(
  listed: readonly Listed[],
  problemsIn: (entry: Listed, source: string) => readonly Problem[],
) {
  const files = yield* RepositoryFiles;
  const found = yield* Effect.forEach(
    listed,
    (entry) =>
      files.readFile(entry.file).pipe(
        Effect.map(
          Option.match({
            onNone: (): readonly Problem[] => [],
            onSome: (source) => problemsIn(entry, source),
          }),
        ),
      ),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});
