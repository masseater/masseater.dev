import { Effect, FileSystem, String as Str } from "effect";
import type { PlatformError } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { videoError } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

const SUCCESS = 0;
const MP4 = /\.mp4$/u;
const RAW = ".raw.mp4";
const LOUDNESS = "loudnorm=I=-14:TP=-1.5:LRA=11";

const argsOf = (raw: string, file: string): readonly string[] => [
  "-v",
  "error",
  "-y",
  "-i",
  raw,
  "-af",
  LOUDNESS,
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  file,
];

/** @internal */
export const normalizeLoudness = (
  file: string,
): Effect.Effect<
  void,
  VideoError | PlatformError.PlatformError,
  FileSystem.FileSystem | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* normalize() {
    const fileSystem = yield* FileSystem.FileSystem;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const raw = Str.replace(MP4, RAW)(file);
    yield* fileSystem.rename(file, raw);
    const exitCode = yield* spawner.exitCode(
      ChildProcess.make("ffmpeg", [...argsOf(raw, file)], {
        stdin: "ignore",
        stdout: "inherit",
        stderr: "inherit",
      }),
    );
    if (exitCode !== SUCCESS) {
      return yield* videoError(`ffmpeg が ${String(exitCode)} で終わった`);
    }
    return yield* fileSystem.remove(raw);
  });
