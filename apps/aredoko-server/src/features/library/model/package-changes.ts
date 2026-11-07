import { Array, Duration, Effect, FileSystem, Stream, pipe } from "effect";

import { isLoose, isPackage } from "#entities/package";

const watchFolder =
  (fileSystem: FileSystem.FileSystem) =>
  (path: string): Stream.Stream<string> =>
    fileSystem.watch(path, { recursive: true }).pipe(
      Stream.map((event) => event.path),
      Stream.catchCause((cause) =>
        Stream.fromEffect(Effect.logWarning("watch failed", path, cause)).pipe(Stream.drain),
      ),
    );

/** @internal */
const packageChanges = Effect.fn("packageChanges")(function* watchPackages(
  paths: readonly string[],
  settleMillis: number,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  return pipe(
    paths,
    Array.map(watchFolder(fileSystem)),
    Stream.mergeAll({ concurrency: "unbounded" }),
    Stream.filter((path) => isPackage(path) || isLoose(path)),
    Stream.debounce(Duration.millis(settleMillis)),
  );
});

export { packageChanges };
