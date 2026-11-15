import { Array as Arr, Effect, Schema, Stream, String as Str } from "effect";
import type { PlatformError, Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const SUCCESS = 0;

const taggedError = Schema.TaggedError;

class CommandFailed extends taggedError<CommandFailed, { readonly brand: unique symbol }>()(
  "CommandFailed",
  { command: Schema.String, exitCode: Schema.Finite },
  { identifier: "CommandFailed" },
) {}

type Invocation = Readonly<{ file: string; args: readonly string[]; cwd?: string }>;

type Output = Effect.Effect<
  string,
  CommandFailed | PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner
>;

const spawnOutput = ({
  file,
  args,
}: Invocation): Effect.Effect<
  string,
  CommandFailed | PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner | Scope.Scope
> =>
  Effect.gen(function* spawn() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* spawner.spawn(
      ChildProcess.make(file, [...args], { stdin: "ignore", stderr: "inherit" }),
    );
    const [stdout, exitCode] = yield* Effect.all(
      [handle.stdout.pipe(Stream.decodeText, Stream.mkString), handle.exitCode],
      { concurrency: "unbounded" },
    );
    if (exitCode !== SUCCESS) {
      return yield* CommandFailed.make({ command: Arr.join([file, ...args], " "), exitCode });
    }
    return Str.trim(stdout);
  });

const output = (invocation: Invocation): Output =>
  Effect.scoped(spawnOutput(invocation)).pipe(Effect.withSpan("command.output"));

const succeeds = Effect.fn("command.succeeds")(function* succeeds({ file, args }: Invocation) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(
    ChildProcess.make(file, [...args], { stdin: "ignore", stdout: "ignore", stderr: "ignore" }),
  );
  return exitCode === SUCCESS;
});

const run = Effect.fn("command.run")(function* run({ file, args, cwd }: Invocation) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(
    ChildProcess.make(file, [...args], {
      cwd,
      stdin: "ignore",
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
  if (exitCode !== SUCCESS) {
    return yield* CommandFailed.make({ command: Arr.join([file, ...args], " "), exitCode });
  }
  return exitCode;
});

const gh = (args: readonly string[]): Output => output({ file: "gh", args });

/** @internal */
export { gh, output, run, succeeds };
export type { Invocation };
