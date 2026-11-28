import { Effect, FileSystem, Path } from "effect";

const BAD_FILES = ["bad.ts", "bad.md", "bad.json", "bad.txt", "bad.yaml"] as const;
const BAD_BYTES = Buffer.from("fffe00c328a0a1e228a1", "hex");

const writeBadInputs = Effect.fn("monkey.cli.badInputs")(function* writeBadInputs(
  directory: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const inputs = path.join(directory, "inputs");
  yield* fs.makeDirectory(inputs);
  yield* Effect.forEach(BAD_FILES, (file) => fs.writeFile(path.join(inputs, file), BAD_BYTES), {
    concurrency: 1,
  });
  return inputs;
});

/** @internal */
export const writeInvalidUtf8Inputs = writeBadInputs;
