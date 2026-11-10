import { Effect, Array as Arr, String as Str, pipe } from "effect";
import type { PlatformError } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const listGitFiles = (
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
  });

const listCommitMessages = (
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
  });

export { listCommitMessages, listGitFiles };
