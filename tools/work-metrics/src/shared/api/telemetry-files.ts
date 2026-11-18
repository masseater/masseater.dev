import { Array as Arr, Effect, FileSystem, Path, pipe } from "effect";

/** @internal */
export const readTelemetry =
  <Item, Failure>(reader: (text: string) => Effect.Effect<readonly Item[], Failure>) =>
  (file: string): Effect.Effect<readonly Item[], Failure, FileSystem.FileSystem> =>
    Effect.gen(function* read() {
      const fileSystem = yield* FileSystem.FileSystem;
      const text = yield* fileSystem.readFileString(file).pipe(Effect.orElseSucceed(() => ""));
      return yield* reader(text);
    });

/** @internal */
export const directoriesIn = Effect.fn("telemetry.directories")(function* directoriesIn(
  root: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(root);
  return pipe(
    names,
    Arr.map((name) => ({ name, directory: path.join(root, name) })),
  );
});
