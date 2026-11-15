import { Array as Arr, Effect, FileSystem, Option, Path, Schedule, Schema, pipe } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const RETRIES = 3;
const EXIT_SUCCESS = 0;

type Entry = Readonly<{ name: string; file: string }>;

const taggedError = Schema.TaggedError;

class RuntimeFailed extends taggedError<RuntimeFailed, { readonly brand: unique symbol }>()(
  "RuntimeFailed",
  { message: Schema.String },
) {}

/** @internal */
const succeeds = Effect.fn("succeeds")(function* succeeds(
  command: string,
  args: readonly string[],
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(ChildProcess.make(command, args));
  if (exitCode !== EXIT_SUCCESS) {
    return yield* RuntimeFailed.make({ message: `${command} exited ${exitCode}` });
  }
  return exitCode;
});

/** @internal */
const outputLines = Effect.fn("outputLines")(function* outputLines(
  command: string,
  args: readonly string[],
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  return yield* spawner.lines(ChildProcess.make(command, args));
});

/** @internal */
const download = Effect.fn("download")(function* download(url: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client
    .get(url)
    .pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.retry(Schedule.recurs(RETRIES)),
    );
  const body = yield* response.arrayBuffer;
  return new Uint8Array(body);
});

/** @internal */
const entries = Effect.fn("entries")(function* entries(directory: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fs.readDirectory(directory);
  return pipe(
    names,
    Arr.map((name): Entry => ({ name, file: path.join(directory, name) })),
  );
});

/** @internal */
const isLink = Effect.fn("isLink")(function* isLink(file: string) {
  const fs = yield* FileSystem.FileSystem;
  const target = yield* fs.readLink(file).pipe(Effect.option);
  return Option.isSome(target);
});

const named =
  (pattern: RegExp) =>
  (all: readonly Entry[]): Entry[] =>
    pipe(
      all,
      Arr.filter(({ name }) => pattern.test(name)),
    );

export { RuntimeFailed, download, entries, isLink, named, outputLines, succeeds };
export type { Entry };
