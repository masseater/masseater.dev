import { readWantedLockfile } from "@pnpm/lockfile.fs";
import { outputOf } from "@r_masseater/github-workflow";
import { Effect, FileSystem, Option, Path, Schema } from "effect";

import { LockfileShape } from "#/entities/lockfile/model/lockfile.ts";
import type { Resolution } from "#/entities/lockfile/model/lockfile.ts";

const FILE = "pnpm-lock.yaml";

const taggedError = Schema.TaggedError;

class LockfileError extends taggedError<LockfileError, { readonly brand: unique symbol }>()(
  "LockfileError",
  { revision: Schema.String },
) {}

const readIn = (directory: string, revision: string): Effect.Effect<Resolution, LockfileError> =>
  Effect.tryPromise({
    try: () => readWantedLockfile(directory, { ignoreIncompatible: false }),
    catch: () => LockfileError.make({ revision }),
  }).pipe(
    Effect.flatMap((lockfile) =>
      Effect.fromOption(Option.fromNullishOr(lockfile)).pipe(
        Effect.mapError(() => LockfileError.make({ revision })),
      ),
    ),
    Effect.flatMap(Schema.decodeUnknownEffect(LockfileShape)),
    Effect.mapError(() => LockfileError.make({ revision })),
  );

/** @internal */
export const lockfileAt = Effect.fn("lockfileAt")(function* lockfileAt(revision: string) {
  const text = yield* outputOf({ command: "git", args: ["show", `${revision}:${FILE}`] });
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fs.makeTempDirectoryScoped();
  yield* fs.writeFileString(path.join(directory, FILE), text);
  return yield* readIn(directory, revision);
}, Effect.scoped);
