import { spansInFile } from "@r_masseater/vitest-otlp/collector-files";
import { Array as Arr, Effect, FileSystem, Path, pipe } from "effect";

import { readTelemetry } from "#/shared/api/index.ts";

const SPAN_FILES = ["traces.jsonl", "ci.jsonl"];

const readSpans = readTelemetry(spansInFile);

/** @internal */
export const spansInDirectories = Effect.fn("timeSpans.files")(function* spansInDirectories(
  directories: readonly string[],
) {
  const path = yield* Path.Path;
  const fileSystem = yield* FileSystem.FileSystem;
  const files = pipe(
    directories,
    Arr.flatMap((directory) =>
      pipe(
        SPAN_FILES,
        Arr.map((name) => path.join(directory, name)),
      ),
    ),
  );
  const found = yield* Effect.forEach(
    files,
    (file) => readSpans(file).pipe(Effect.provideService(FileSystem.FileSystem, fileSystem)),
    { concurrency: 4 },
  );
  return Arr.flatten(found);
});
