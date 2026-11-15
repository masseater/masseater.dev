import { Array as Arr, Effect, Schema, Stream, String as Str } from "effect";
import type { PlatformError } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const SUCCESS = 0;

const taggedError = Schema.TaggedError;

class CommandFailed extends taggedError<CommandFailed, { readonly brand: unique symbol }>()(
  "CommandFailed",
  { message: Schema.String },
) {}

interface Command {
  readonly command: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
}

type Spawned<Success> = Effect.Effect<
  Success,
  CommandFailed | PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner
>;

const failed = ({ command, args }: Command): CommandFailed =>
  CommandFailed.make({ message: `${command} ${Arr.join(args, " ")} failed` });

const exitCodeOf = Effect.fn("exitCodeOf")(function* exitCodeOf({ command, args, env }: Command) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  return yield* spawner.exitCode(
    ChildProcess.make(command, args, {
      env,
      extendEnv: true,
      stdin: "ignore",
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
});

const succeedsWith = (command: Command): Spawned<boolean> =>
  exitCodeOf(command).pipe(Effect.map((code) => code === SUCCESS));

const mustSucceedWith = (command: Command): Spawned<void> =>
  succeedsWith(command).pipe(
    Effect.filterOrFail(
      (passed) => passed,
      () => failed(command),
    ),
    Effect.asVoid,
  );

const collected = Effect.fn("collected")(function* collected({ command, args, env }: Command) {
  const handle = yield* ChildProcess.make(command, args, {
    env,
    extendEnv: true,
    stdin: "ignore",
    stderr: "inherit",
  });
  const [output, code] = yield* Effect.all(
    [handle.stdout.pipe(Stream.decodeText(), Stream.mkString), handle.exitCode],
    { concurrency: "unbounded" },
  );
  return { output, code };
});

const outputWith = (command: Command): Spawned<string> =>
  collected(command).pipe(
    Effect.scoped,
    Effect.filterOrFail(
      ({ code }) => code === SUCCESS,
      () => failed(command),
    ),
    Effect.map(({ output }) => Str.trim(output)),
  );

/** @internal */
const succeeds = succeedsWith;

/** @internal */
const mustSucceed = mustSucceedWith;

const finishedWith = (command: Command): Spawned<Readonly<{ output: string; code: number }>> =>
  Effect.scoped(collected(command));

/** @internal */
const outputOf = outputWith;

/** @internal */
const finished = finishedWith;

export type { Command };
export { CommandFailed, finished, mustSucceed, outputOf, succeeds };
