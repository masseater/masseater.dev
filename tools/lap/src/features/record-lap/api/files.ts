import { Clock, Config, DateTime, Effect, FileSystem, Path, String as Str, pipe } from "effect";

const TASK_CACHE = "node_modules/.vite/task-cache";
const SUMMARY = "last-summary.json";
const COLON = /:/gu;

/** @internal */
export const lapDirectory = Effect.fn("lap.directory")(function* lapDirectory(name: string) {
  const path = yield* Path.Path;
  const fileSystem = yield* FileSystem.FileSystem;
  const home = yield* Config.String("HOME");
  const now = yield* Clock.currentTimeMillis;
  const stamp = pipe(DateTime.makeUnsafe(now), DateTime.formatIso, Str.replaceAll(COLON, "-"));
  const directory = path.join(home, ".cache", "lap", `${stamp}-${name}`);
  yield* fileSystem.makeDirectory(directory, { recursive: true });
  return directory;
});

/** @internal */
export const appendLine = Effect.fn("lap.append")(function* appendLine(file: string, line: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.writeFileString(file, line, { flag: "a" });
});

/** @internal */
export const keepSummary = Effect.fn("lap.summary")(function* keepSummary(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const versions = yield* fileSystem.readDirectory(TASK_CACHE);
  yield* Effect.forEach(
    versions,
    (version) =>
      fileSystem.copyFile(
        path.join(TASK_CACHE, version, SUMMARY),
        path.join(directory, "vp-summary.json"),
      ),
    { concurrency: 1, discard: true },
  );
});
