import {
  Array as Arr,
  Config,
  Console,
  Effect,
  FileSystem,
  Record as Rec,
  Schema,
  pipe,
} from "effect";
import type { PlatformError } from "effect";

type Appended = Effect.Effect<
  void,
  Config.ConfigError | PlatformError.PlatformError,
  FileSystem.FileSystem
>;

const taggedError = Schema.TaggedError;

class WorkflowFailed extends taggedError<WorkflowFailed, { readonly brand: unique symbol }>()(
  "WorkflowFailed",
  { message: Schema.String },
) {}

const appendTo = (variable: string, entries: Readonly<Record<string, string>>): Appended =>
  Effect.gen(function* appended() {
    const path = yield* Config.String(variable);
    const fs = yield* FileSystem.FileSystem;
    const lines = pipe(
      Rec.toEntries(entries),
      Arr.map(([name, value]) => `${name}=${value}\n`),
      Arr.join(""),
    );
    yield* fs.writeFileString(path, lines, { flag: "a" });
  });

const outputsOf = (outputs: Readonly<Record<string, string>>): Appended =>
  appendTo("GITHUB_OUTPUT", outputs);

const envOf = (variables: Readonly<Record<string, string>>): Appended =>
  appendTo("GITHUB_ENV", variables);

/** @internal */
const writeOutputs = outputsOf;

/** @internal */
const setEnv = envOf;

const warn = (message: string): Effect.Effect<void> => Console.log(`::warning::${message}`);

const mask = (value: string): Effect.Effect<void> => Console.log(`::add-mask::${value}`);

const fail = Effect.fn("fail")(function* fail(message: string) {
  yield* Console.log(`::error::${message}`);
  return yield* WorkflowFailed.make({ message });
});

export { WorkflowFailed, fail, mask, setEnv, warn, writeOutputs };
