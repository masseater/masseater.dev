import { Array as Arr, Config, Console, Effect, FileSystem, Record as Rec, pipe } from "effect";
import type { PlatformError } from "effect";

const writeOutputsTo = (
  outputs: Readonly<Record<string, string>>,
): Effect.Effect<void, Config.ConfigError | PlatformError.PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* written() {
    const path = yield* Config.String("GITHUB_OUTPUT");
    const fs = yield* FileSystem.FileSystem;
    const lines = pipe(
      Rec.toEntries(outputs),
      Arr.map(([name, value]) => `${name}=${value}\n`),
      Arr.join(""),
    );
    yield* fs.writeFileString(path, lines, { flag: "a" });
  });

/** @internal */
const writeOutputs = writeOutputsTo;

const warn = (message: string): Effect.Effect<void> => Console.log(`::warning::${message}`);

export { warn, writeOutputs };
