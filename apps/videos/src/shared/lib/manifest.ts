import { Effect, FileSystem, Path, Schema } from "effect";
import type { PlatformError } from "effect";

import { NARRATION_MANIFEST } from "#/shared/config/index.ts";

import type { Manifest } from "./manifest-schema.ts";
import { EMPTY_MANIFEST, ManifestJson } from "./manifest-schema.ts";
import { projectPaths } from "./project.ts";
import { failedWith } from "./video-error.ts";
import type { VideoError } from "./video-error.ts";

const manifestFile: Effect.Effect<string, never, Path.Path> = Effect.gen(function* file() {
  const path = yield* Path.Path;
  const paths = yield* projectPaths;
  return path.join(paths.public, NARRATION_MANIFEST);
});

/** @internal */
export const readManifest: Effect.Effect<
  Manifest,
  VideoError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> = Effect.gen(function* read() {
  const fileSystem = yield* FileSystem.FileSystem;
  const file = yield* manifestFile;
  if (!(yield* fileSystem.exists(file))) {
    return EMPTY_MANIFEST;
  }
  const text = yield* fileSystem.readFileString(file);
  return yield* Schema.decodeEffect(ManifestJson)(text).pipe(Effect.mapError(failedWith));
});

/** @internal */
export const writeManifest = (
  manifest: Manifest,
): Effect.Effect<
  void,
  VideoError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* write() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const file = yield* manifestFile;
    const text = yield* Schema.encodeEffect(ManifestJson)(manifest).pipe(
      Effect.mapError(failedWith),
    );
    yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
    yield* fileSystem.writeFileString(file, text);
  });
