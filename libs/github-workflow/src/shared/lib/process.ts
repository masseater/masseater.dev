import { Array as Arr, Effect, Schema, Stream, String as Str } from "effect";
import type { PlatformError } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const SUCCESS = 0;

const taggedError = Schema.TaggedError;

export class CommandFailed extends taggedError<CommandFailed, { readonly brand: unique symbol }>()(
  "CommandFailed",
  { message: Schema.String },
) {}

export interface Command {
  readonly command: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly cwd?: string;
}

const failed = ({ command, args }: Command): CommandFailed =>
  CommandFailed.make({ message: `${command} ${Arr.join(args, " ")} failed` });

const exitCodeOf = Effect.fn("exitCodeOf")(function* exitCodeOf({
  command,
  args,
  env,
  cwd,
}: Command) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  return yield* spawner.exitCode(
    ChildProcess.make(command, args, {
      cwd,
      env,
      extendEnv: true,
      stdin: "ignore",
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
});

const succeedsWith = (
  command: Command,
): Effect.Effect<
  boolean,
  CommandFailed | PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner
> => exitCodeOf(command).pipe(Effect.map((code) => code === SUCCESS));

const mustSucceedWith = (
  command: Command,
): Effect.Effect<
  void,
  CommandFailed | PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  succeedsWith(command).pipe(
    Effect.filterOrFail(
      (passed) => passed,
      () => failed(command),
    ),
    Effect.asVoid,
  );

const collected = Effect.fn("collected")(function* collected({ command, args, env, cwd }: Command) {
  const handle = yield* ChildProcess.make(command, args, {
    cwd,
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

const outputWith = (
  command: Command,
): Effect.Effect<
  string,
  CommandFailed | PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  collected(command).pipe(
    Effect.scoped,
    Effect.filterOrFail(
      ({ code }) => code === SUCCESS,
      () => failed(command),
    ),
    Effect.map(({ output }) => Str.trim(output)),
  );

/** @internal */
export const succeeds = succeedsWith;

/** @internal */
export const mustSucceed = mustSucceedWith;

const finishedWith = (
  command: Command,
): Effect.Effect<
  Readonly<{ output: string; code: number }>,
  CommandFailed | PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner
> => Effect.scoped(collected(command));

/** @internal */
export const outputOf = outputWith;

/** @internal */
export const finished = finishedWith;
