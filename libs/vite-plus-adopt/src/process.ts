import { Effect, Option, Stream, pipe } from "effect";
import type { PlatformError } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import type { Report } from "./report.ts";

const SUCCESS = 0;

interface Invocation {
  readonly root: string;
  readonly file: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly input?: string | undefined;
  readonly output?: "all" | "stdout";
}

const stdinOf = (input: string | undefined): ChildProcess.CommandInput =>
  pipe(
    Option.fromNullishOr(input),
    Option.match({
      onNone: (): ChildProcess.CommandInput => "ignore",
      onSome: (text) => Stream.make(new TextEncoder().encode(text)),
    }),
  );

const runCaptured = ({
  root,
  file,
  args,
  env = {},
  input,
  output = "all",
}: Invocation): Effect.Effect<
  Report,
  PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* run() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* spawner.spawn(
      ChildProcess.make(file, args, { cwd: root, env, extendEnv: true, stdin: stdinOf(input) }),
    );
    const [text, exitCode] = yield* Effect.all(
      [handle[output].pipe(Stream.decodeText, Stream.mkString), handle.exitCode],
      { concurrency: "unbounded" },
    );
    return { valid: exitCode === SUCCESS, output: text };
  }).pipe(Effect.scoped);

export { runCaptured };
export type { Invocation };
