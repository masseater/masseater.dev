import { Array as Arr, Effect, FileSystem, Path, pipe } from "effect";
import type { PlatformError } from "effect";

import { projectPaths, readScript, scriptPath } from "#/shared/lib/project.ts";
import { videoError } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

import { TEMPLATE, ejectedSource } from "./template.ts";

/** @internal */
export type Services = FileSystem.FileSystem | Path.Path;

const writeNew = ({
  file,
  text,
}: Readonly<{ file: string; text: string }>): Effect.Effect<
  string,
  VideoError | PlatformError.PlatformError,
  Services
> =>
  Effect.gen(function* write() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    if (yield* fileSystem.exists(file)) {
      return yield* videoError(`${file} はもうある`);
    }
    yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
    yield* fileSystem.writeFileString(file, text);
    return file;
  });

/** @internal */
export const createVideo = (
  slug: string,
): Effect.Effect<string, VideoError | PlatformError.PlatformError, Services> =>
  scriptPath(slug).pipe(Effect.flatMap((file) => writeNew({ file, text: TEMPLATE })));

/** @internal */
export const ejectScene = ({
  slug,
  id,
}: Readonly<{ slug: string; id: string }>): Effect.Effect<
  string,
  VideoError | PlatformError.PlatformError,
  Services
> =>
  Effect.gen(function* eject() {
    const path = yield* Path.Path;
    const paths = yield* projectPaths;
    const script = yield* readScript(slug);
    const known = pipe(
      script.scenes,
      Arr.some((scene) => scene.id === id),
    );
    if (!known) {
      return yield* videoError(`${slug} にシーン ${id} がない`);
    }
    const file = path.join(paths.root, "src/pages", slug, "scenes", `${id}.tsx`);
    return yield* writeNew({ file, text: ejectedSource(id) });
  });
