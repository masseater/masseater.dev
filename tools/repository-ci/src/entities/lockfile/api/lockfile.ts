import { readWantedLockfile } from "@pnpm/lockfile.fs";
import type { LockfileObject } from "@pnpm/lockfile.types";
import { outputOf } from "@r_masseater/github-workflow";
import { Effect, FileSystem, Option, Path, Schema } from "effect";

const FILE = "pnpm-lock.yaml";

const taggedError = Schema.TaggedError;

/** @internal */
export class LockfileError extends taggedError<LockfileError, { readonly brand: unique symbol }>()(
  "LockfileError",
  { directory: Schema.String },
) {}

/** @internal */
export const lockfileIn = (directory: string): Effect.Effect<LockfileObject, LockfileError> =>
  Effect.tryPromise({
    try: () => readWantedLockfile(directory, { ignoreIncompatible: false }),
    catch: () => LockfileError.make({ directory }),
  }).pipe(
    Effect.flatMap((lockfile) =>
      Effect.fromOption(Option.fromNullishOr(lockfile)).pipe(
        Effect.mapError(() => LockfileError.make({ directory })),
      ),
    ),
  );

/** @internal */
export const lockfileAt = Effect.fn("lockfileAt")(function* lockfileAt(revision: string) {
  const text = yield* outputOf({ command: "git", args: ["show", `${revision}:${FILE}`] });
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fs.makeTempDirectoryScoped();
  yield* fs.writeFileString(path.join(directory, FILE), text);
  return yield* lockfileIn(directory);
}, Effect.scoped);
