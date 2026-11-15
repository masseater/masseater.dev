import { Config, Console, Effect, FileSystem, Schema } from "effect";

const taggedError = Schema.TaggedError;

class WorkflowFailed extends taggedError<WorkflowFailed, { readonly brand: unique symbol }>()(
  "WorkflowFailed",
  { message: Schema.String },
) {}

const fail = Effect.fn("fail")(function* fail(message: string) {
  yield* Console.log(`::error::${message}`);
  return yield* WorkflowFailed.make({ message });
});

const mask = (value: string): Effect.Effect<void> => Console.log(`::add-mask::${value}`);

const setEnv = Effect.fn("setEnv")(function* setEnv(
  entry: Readonly<{ name: string; value: string }>,
) {
  const path = yield* Config.String("GITHUB_ENV");
  const fs = yield* FileSystem.FileSystem;
  yield* fs.writeFileString(path, `${entry.name}=${entry.value}\n`, { flag: "a" });
});

export { fail, mask, setEnv };
