import { Effect, FileSystem, Option, pipe } from "effect";

const UNKNOWN_TIME = 0;

/** @internal */
const statOf = Effect.fn("statOf")(function* statFile(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const info = yield* fileSystem.stat(file);
  return {
    size: globalThis.Number(info.size),
    modifiedAt: pipe(
      info.mtime,
      Option.map((date) => date.getTime()),
      Option.getOrElse(() => UNKNOWN_TIME),
    ),
  };
});

export { statOf };
