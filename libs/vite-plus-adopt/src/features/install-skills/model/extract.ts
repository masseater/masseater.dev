import { Array as Arr, Effect, Exit, FileSystem, Path, String as Str, pipe } from "effect";
import type { PlatformError } from "effect";

import type { VpToolsError } from "#/shared/lib/errors.ts";
import { toJson } from "#/shared/lib/json.ts";
import type { TarEntry } from "#/shared/lib/tar-gz.ts";

import { SEPARATOR, isUnder, relativeTo } from "./archive.ts";
import type { FoundSkill } from "./archive.ts";

/** @internal */
export type FileServices = FileSystem.FileSystem | Path.Path;

/** @internal */
export type ExtractError = VpToolsError | PlatformError.PlatformError;

/** @internal */
export const INDEX = ".index.json";

const READ_ONLY = 0o444;
const READ_ONLY_EXECUTABLE = 0o555;
const OWNER_EXECUTE = 0o100;
const BIT = 2;
const SET = 1;

const modeOf = (mode: number): number => {
  if (Math.trunc(mode / OWNER_EXECUTE) % BIT === SET) {
    return READ_ONLY_EXECUTABLE;
  }
  return READ_ONLY;
};

const renameOrKeep = (
  staging: string,
  target: string,
): Effect.Effect<void, PlatformError.PlatformError, FileServices> =>
  Effect.gen(function* renameOrKeepPlaced() {
    const fs = yield* FileSystem.FileSystem;
    const renamed = yield* Effect.exit(fs.rename(staging, target));
    if (Exit.isSuccess(renamed) || !(yield* fs.exists(target))) {
      return yield* renamed;
    }
    return yield* fs.remove(staging, { recursive: true });
  });

const placeAtomically = <Failure>(
  target: string,
  write: (staging: string) => Effect.Effect<void, Failure, FileServices>,
): Effect.Effect<void, Failure | PlatformError.PlatformError, FileServices> =>
  Effect.gen(function* place() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* fs.makeDirectory(path.dirname(target), { recursive: true });
    const staging = yield* fs.makeTempDirectory({
      directory: path.dirname(target),
      prefix: ".partial-",
    });
    yield* write(staging);
    yield* renameOrKeep(staging, target);
  });

const writeEntry =
  (staging: string, skill: FoundSkill) =>
  ({ header, bytes }: TarEntry): Effect.Effect<void, PlatformError.PlatformError, FileServices> =>
    Effect.gen(function* writeFile() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const relative = relativeTo(skill.directory)(header.path);
      const file = path.join(staging, ...Str.split(SEPARATOR)(relative));
      yield* fs.makeDirectory(path.dirname(file), { recursive: true });
      yield* fs.writeFile(file, bytes);
      yield* fs.chmod(file, modeOf(header.mode));
    });

/** @internal */
export interface Placement {
  readonly skill: FoundSkill;
  readonly target: string;
}

/** @internal */
export const extractSkill =
  ({ skill, target }: Placement) =>
  (entries: readonly TarEntry[]): Effect.Effect<void, ExtractError, FileServices> =>
    placeAtomically(target, (staging) =>
      Effect.forEach(
        pipe(
          entries,
          Arr.filter(
            ({ header }) => header.type === "File" && isUnder(skill.directory)(header.path),
          ),
        ),
        writeEntry(staging, skill),
        { concurrency: 1, discard: true },
      ),
    );

/** @internal */
export const writeIndex =
  (directory: string) =>
  (available: readonly string[]): Effect.Effect<void, ExtractError, FileServices> =>
    Effect.gen(function* writeIndexFile() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      yield* fs.makeDirectory(directory, { recursive: true });
      const staging = yield* fs.makeTempDirectory({ directory, prefix: ".partial-" });
      const partial = path.join(staging, INDEX);
      yield* fs.writeFileString(partial, toJson(available));
      yield* fs.rename(partial, path.join(directory, INDEX));
      yield* fs.remove(staging, { recursive: true });
    });
