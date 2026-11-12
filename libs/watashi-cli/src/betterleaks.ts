import { Array as Arr, Effect, FileSystem, Option, Stream, String as Str, pipe } from "effect";
import type { PlatformError, Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { BETTERLEAKS_CONFIG, BETTERLEAKS_VERSION } from "./betterleaks-config.ts";
import { WatashiFailed } from "./errors.ts";
import { parseReport } from "./report.ts";
import type { Finding } from "./report.ts";

type Detector = (text: string) => Effect.Effect<readonly Finding[], WatashiFailed>;

type Command = readonly [string, ...string[]];

type Output = Readonly<{ exitCode: number; stdout: string; stderr: string }>;

type Run = Readonly<{ command: Command; args: readonly string[]; input: Option.Option<string> }>;

const SUCCESS = 0;
const START = 0;
const SHOWN_STDERR = 2000;

const STDIN_ARGS = [
  "stdin",
  "--no-banner",
  "--log-level",
  "error",
  "--output",
  "-",
  "--exit-code",
  "0",
];

const MAJOR = pipe(Str.split(".")(BETTERLEAKS_VERSION), Arr.headNonEmpty);

const unavailable = (message: string): WatashiFailed =>
  WatashiFailed.make({ reason: "Betterleaks", message });

const stdinOf = (input: Option.Option<string>): ChildProcess.CommandInput =>
  Option.match(input, {
    onNone: (): ChildProcess.CommandInput => "ignore",
    onSome: (text) => Stream.make(new TextEncoder().encode(text)),
  });

const run = ({
  command,
  args,
  input,
}: Run): Effect.Effect<
  Output,
  PlatformError.PlatformError | WatashiFailed,
  ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* spawn() {
    const [file, ...prefix] = command;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const process = ChildProcess.make(file, [...prefix, ...args], { stdin: stdinOf(input) });
    const handle = yield* spawner.spawn(process);
    const [stdout, stderr, exitCode] = yield* Effect.all(
      [
        handle.stdout.pipe(Stream.decodeText, Stream.mkString),
        handle.stderr.pipe(Stream.decodeText, Stream.mkString),
        handle.exitCode,
      ],
      { concurrency: "unbounded" },
    );
    return { exitCode, stdout, stderr };
  }).pipe(Effect.scoped);

const works = (
  command: Command,
): Effect.Effect<boolean, never, ChildProcessSpawner.ChildProcessSpawner> =>
  run({ command, args: ["version"], input: Option.none() }).pipe(
    Effect.map(({ exitCode, stdout }) => exitCode === SUCCESS && Str.includes(MAJOR)(stdout)),
    Effect.orElseSucceed(() => false),
  );

const INSTALLED: readonly Command[] = [
  ["mise", "exec", `betterleaks@${BETTERLEAKS_VERSION}`, "--", "betterleaks"],
  ["betterleaks"],
];

const candidatesOf = (explicit: Option.Option<string>): readonly Command[] =>
  Option.match(explicit, {
    onSome: (path): readonly Command[] => [[path]],
    onNone: () => INSTALLED,
  });

const resolveBetterleaks = (
  explicit: Option.Option<string>,
): Effect.Effect<Command, WatashiFailed, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.findFirst(candidatesOf(explicit), works).pipe(
    Effect.flatMap(Effect.fromOption),
    Effect.mapError(() =>
      unavailable(
        `betterleaks ${BETTERLEAKS_VERSION} が無い。mise で入れるか WATASHI_BETTERLEAKS にパスを置く。`,
      ),
    ),
  );

const reportOf = (output: Output): Effect.Effect<readonly Finding[], WatashiFailed> => {
  if (output.exitCode !== SUCCESS) {
    return Effect.fail(
      unavailable(
        `betterleaks exited with ${String(output.exitCode)}: ${Str.slice(START, SHOWN_STDERR)(output.stderr)}`,
      ),
    );
  }
  return parseReport(output.stdout).pipe(
    Effect.mapError((failure) => unavailable(failure.message)),
  );
};

const betterleaksDetector = (
  command: Command,
): Effect.Effect<
  Detector,
  PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Scope.Scope
> =>
  Effect.gen(function* detector() {
    const fs = yield* FileSystem.FileSystem;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const config = yield* fs.makeTempFileScoped({
      prefix: "watashi-betterleaks-",
      suffix: ".toml",
    });
    yield* fs.writeFileString(config, BETTERLEAKS_CONFIG);
    const args = [...STDIN_ARGS, "--config", config];
    const detect: Detector = (text) =>
      run({ command, args, input: Option.some(text) }).pipe(
        Effect.mapError((failure) => unavailable(failure.message)),
        Effect.flatMap(reportOf),
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
      );
    return detect;
  });

/** @internal */
export { betterleaksDetector, resolveBetterleaks };
/** @internal */
export type { Command, Detector };
