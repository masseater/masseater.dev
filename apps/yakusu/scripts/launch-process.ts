import { Array as Arr, Effect, Stream } from "effect";
import type { PlatformError, Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const SUCCESS = 0;

/** @internal */
export type Spawn = Readonly<{
  file: string;
  args: readonly string[];
  env?: Readonly<Record<string, string>>;
  stdin?: ChildProcess.CommandInput;
}>;

/** @internal */
export type Captured = Effect.Effect<
  string,
  PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner
>;

const encoder = new TextEncoder();

/** @internal */
export const input = (text: string): ChildProcess.CommandInput => Stream.make(encoder.encode(text));

const commandOf = (
  { file, args, env, stdin }: Spawn,
  stdout: "inherit" | "pipe",
): ChildProcess.Command =>
  ChildProcess.make(file, [...args], {
    env: { ...env },
    extendEnv: true,
    stdin: stdin ?? "ignore",
    stdout,
    stderr: stdout,
  });

/** @internal */
export const background = Effect.fn("launch.background")(function* background(spawn: Spawn) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  return yield* spawner.spawn(commandOf(spawn, "inherit"));
});

/** @internal */
export const succeed = Effect.fn("launch.succeed")(function* succeed(spawn: Spawn) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(commandOf(spawn, "inherit"));
  if (exitCode !== SUCCESS) {
    return yield* Effect.die(
      `${Arr.join([spawn.file, ...spawn.args], " ")} exited with ${exitCode}`,
    );
  }
  return exitCode;
});

const captureScoped = (
  spawn: Spawn,
): Effect.Effect<
  string,
  PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner | Scope.Scope
> =>
  Effect.gen(function* captured() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* spawner.spawn(commandOf(spawn, "pipe"));
    const [text] = yield* Effect.all(
      [handle.all.pipe(Stream.decodeText, Stream.mkString), handle.exitCode],
      {
        concurrency: "unbounded",
      },
    );
    return text;
  });

/** @internal */
export const capture = (spawn: Spawn): Captured => Effect.scoped(captureScoped(spawn));
