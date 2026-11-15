import { Array as Arr, Effect, FileSystem, Option, Path, String as Str, pipe } from "effect";
import type { PlatformError, Scope } from "effect";
import type { ChildProcessSpawner } from "effect/process";

/** @internal */
export const IDENTIFIER = "dev.masseater.yakusu";
/** @internal */
export const LOG = "llama-server.log";
/** @internal */
export const OUTPUT = "release-reports";

/** @internal */
export type Requirements =
  | FileSystem.FileSystem
  | Path.Path
  | ChildProcessSpawner.ChildProcessSpawner
  | Scope.Scope;

/** @internal */
export type Step<Value> = Effect.Effect<Value, PlatformError.PlatformError | Error, Requirements>;

/** @internal */
export type Target = Readonly<{
  start: (installers: string) => Step<void>;
  log: Step<string>;
  screenshot: (file: string) => Step<void>;
  processes: Step<string>;
}>;

/** @internal */
export const firstWith = Effect.fn("launch.firstWith")(function* firstWith(
  directory: string,
  suffix: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(directory);
  const found = pipe(names, Arr.findFirst(Str.endsWith(suffix)));
  if (Option.isNone(found)) {
    return yield* Effect.die(`${directory} has no ${suffix}`);
  }
  return path.join(directory, found.value);
});
