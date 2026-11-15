import { Config, Effect, FileSystem } from "effect";

const setOutput = Effect.fn("actions.setOutput")(function* setOutput(name: string, value: string) {
  const file = yield* Config.String("GITHUB_OUTPUT");
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.writeFileString(file, `${name}=${value}\n`, { flag: "a" });
});

const mask = (value: string): Effect.Effect<void> =>
  Effect.sync(() => {
    process.stdout.write(`::add-mask::${value}\n`);
  });

/** @internal */
export { mask, setOutput };
