import { Effect, FileSystem, Schema } from "effect";

const Manifest = Schema.fromJsonString(
  Schema.Struct({ name: Schema.String, version: Schema.String }),
);

/** @internal */
export const manifest = Effect.gen(function* manifest() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString("package.json");
  return yield* Schema.decodeEffect(Manifest)(text);
});

/** @internal */
export const feedOf = (name: string): string => `${name}-updater`;

/** @internal */
export const environmentOf = (name: string): string => `${name}-release`;
