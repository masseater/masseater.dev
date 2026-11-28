import { Duration, Effect, Function as Fn, Option, Stream, pipe } from "effect";
import type { PlatformError, Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

export type ProcessInput = Readonly<{
  command: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  timeout: Duration.Input;
}>;

export type ProcessResult = Readonly<{ exit: Option.Option<number>; output: string }>;

const NOT_STARTED = 127;
const KILL_AFTER_SECONDS = 2;

const finished = (
  input: ProcessInput,
): Effect.Effect<
  ProcessResult,
  PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner | Scope.Scope
> =>
  Effect.gen(function* finishedProcess() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* spawner.spawn(
      ChildProcess.make(input.command, input.args, {
        cwd: input.cwd,
        env: input.env,
        extendEnv: false,
        stdin: "ignore",
        forceKillAfter: Duration.seconds(KILL_AFTER_SECONDS),
      }),
    );
    const [output, code] = yield* Effect.all(
      [pipe(handle.all, Stream.decodeText(), Stream.mkString), handle.exitCode],
      { concurrency: "unbounded" },
    );
    return { exit: Option.some<number>(code), output };
  });

const failedToStart = (error: PlatformError.PlatformError): ProcessResult => ({
  exit: Option.some(NOT_STARTED),
  output: error.message,
});

const hung: ProcessResult = { exit: Option.none(), output: "" };

const orHung = Option.getOrElse(Fn.constant(hung));

/** @internal */
export const runProcess = (
  input: ProcessInput,
): Effect.Effect<ProcessResult, never, ChildProcessSpawner.ChildProcessSpawner> =>
  finished(input).pipe(
    Effect.timeoutOption(input.timeout),
    Effect.match({
      onFailure: failedToStart,
      onSuccess: orHung,
    }),
    Effect.scoped,
  );
