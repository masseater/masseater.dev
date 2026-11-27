import { Effect, FileSystem, Path } from "effect";
import type { PlatformError } from "effect";

import { videoFile } from "#/shared/lib/project.ts";
import { videoError } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

import { SCRIPT_TEMPLATE, VIDEO_TEMPLATE } from "./template.ts";

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
): Effect.Effect<readonly string[], VideoError | PlatformError.PlatformError, Services> =>
  Effect.gen(function* create() {
    const scriptFile = yield* videoFile({ slug, name: "script.ts" });
    const videoTsx = yield* videoFile({ slug, name: "video.tsx" });
    const written = yield* writeNew({ file: scriptFile, text: SCRIPT_TEMPLATE });
    const drawn = yield* writeNew({ file: videoTsx, text: VIDEO_TEMPLATE });
    return [written, drawn];
  });
