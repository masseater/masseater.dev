import { Effect, FileSystem } from "effect";
import type { PlatformError } from "effect";
import { HttpClient } from "effect/http";

import { failedWith } from "#/shared/lib/video-error.ts";
import type { VideoError } from "#/shared/lib/video-error.ts";

/** @internal */
export const downloadDirect = ({
  url,
  file,
}: Readonly<{ url: string; file: string }>): Effect.Effect<
  void,
  VideoError | PlatformError.PlatformError,
  FileSystem.FileSystem | HttpClient.HttpClient
> =>
  Effect.gen(function* download() {
    const fileSystem = yield* FileSystem.FileSystem;
    const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
    const response = yield* client.get(url).pipe(Effect.mapError(failedWith));
    const buffer = yield* response.arrayBuffer.pipe(Effect.mapError(failedWith));
    yield* fileSystem.writeFile(file, new Uint8Array(buffer));
  });
