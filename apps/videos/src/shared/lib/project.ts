import type { Script } from "@masseater.dev/video-kit/script";
import { parseScript } from "@masseater.dev/video-kit/script";
import { Effect, FileSystem, Path } from "effect";
import type { PlatformError } from "effect";

import { failedWith } from "./video-error.ts";
import type { VideoError } from "./video-error.ts";

export interface ProjectPaths {
  readonly root: string;
  readonly public: string;
  readonly out: string;
}

const ROOT_FROM_HERE = "../../..";

/** @internal */
export const projectPaths: Effect.Effect<ProjectPaths, never, Path.Path> = Effect.gen(
  function* paths() {
    const path = yield* Path.Path;
    const root = path.resolve(import.meta.dirname, ROOT_FROM_HERE);
    return { root, public: path.join(root, "public"), out: path.join(root, "out") };
  },
);

/** @internal */
export const scriptPath = (slug: string): Effect.Effect<string, never, Path.Path> =>
  Effect.gen(function* script() {
    const path = yield* Path.Path;
    const { root } = yield* projectPaths;
    return path.join(root, "src/pages", slug, "video.md");
  });

/** @internal */
export const readScript = (
  slug: string,
): Effect.Effect<
  Script,
  VideoError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* read() {
    const fileSystem = yield* FileSystem.FileSystem;
    const file = yield* scriptPath(slug);
    const markdown = yield* fileSystem.readFileString(file);
    return yield* parseScript(markdown).pipe(Effect.mapError(failedWith));
  });
