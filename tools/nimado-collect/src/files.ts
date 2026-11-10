import { Effect, FileSystem, Option, Path, Schema } from "effect";

const UNFINISHED = ".tmp";

/** @internal */
const readJson = Effect.fn("file.read")(function* readJsonFile<
  Value extends Schema.Codec<unknown, unknown>,
>({ codec, file }: Readonly<{ codec: Value; file: string }>) {
  const fileSystem = yield* FileSystem.FileSystem;
  const exists = yield* fileSystem.exists(file);
  if (!exists) {
    return Option.none<Value["Type"]>();
  }
  const text = yield* fileSystem.readFileString(file);
  const value = yield* Schema.decodeEffect(Schema.fromJsonString(codec))(text);
  return Option.some(value);
});

/** @internal */
const writeJson = Effect.fn("file.write")(function* writeJsonFile<
  Value extends Schema.Codec<unknown, unknown>,
>({ codec, file, value }: Readonly<{ codec: Value; file: string; value: Value["Type"] }>) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* Schema.encodeEffect(Schema.fromJsonString(codec))(value);
  yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
  const unfinished = `${file}${UNFINISHED}`;
  yield* fileSystem.writeFileString(unfinished, text);
  yield* fileSystem.rename(unfinished, file);
});

export { readJson, writeJson };
