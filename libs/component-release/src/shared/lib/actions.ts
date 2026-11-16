import { Config, Effect, FileSystem } from "effect";

/** @internal */
export const setOutput = Effect.fn("actions.setOutput")(function* setOutput(
  name: string,
  value: string,
) {
  const file = yield* Config.String("GITHUB_OUTPUT");
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.writeFileString(file, `${name}=${value}\n`, { flag: "a" });
});

/** @internal */
export const mask = (value: string): Effect.Effect<void> =>
  Effect.sync(() => {
    process.stdout.write(`::add-mask::${value}\n`);
  });
