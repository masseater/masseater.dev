import { Effect, Array as Arr, String as Str, pipe, Function as Fn } from "effect";
import type { PlatformError } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const DATA_FIRST_ARITY = 2;

const listGitFiles: {
  (
    pathspecs: readonly string[],
  ): (
    root: string,
  ) => Effect.Effect<
    readonly string[],
    PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner
  >;
  (
    root: string,
    pathspecs: readonly string[],
  ): Effect.Effect<
    readonly string[],
    PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner
  >;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (
    root: string,
    pathspecs: readonly string[],
  ): Effect.Effect<
    readonly string[],
    PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner
  > =>
    Effect.gen(function* list() {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const output = yield* spawner.string(
        ChildProcess.make(
          "git",
          [
            "-c",
            "core.quotePath=false",
            "ls-files",
            "-co",
            "--exclude-standard",
            "-z",
            "--",
            ...pathspecs,
          ],
          { cwd: root },
        ),
      );
      return pipe(Str.split(output, "\0"), Arr.filter(Str.isNonEmpty));
    }),
);

const listCommitMessages: {
  (
    range: string,
  ): (
    root: string,
  ) => Effect.Effect<
    readonly string[],
    PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner
  >;
  (
    root: string,
    range: string,
  ): Effect.Effect<
    readonly string[],
    PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner
  >;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (
    root: string,
    range: string,
  ): Effect.Effect<
    readonly string[],
    PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner
  > =>
    Effect.gen(function* messages() {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const output = yield* spawner.string(
        ChildProcess.make("git", ["log", "-z", "--first-parent", "--format=%B", range, "--"], {
          cwd: root,
        }),
      );
      return pipe(Str.split(output, "\0"), Arr.filter(Str.isNonEmpty));
    }),
);

/** @internal */
export { listCommitMessages, listGitFiles };
