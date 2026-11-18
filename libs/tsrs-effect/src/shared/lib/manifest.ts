import { Effect, FileSystem, Path, Schema } from "effect";

const Upstream = Schema.Struct({
  effect: Schema.String,
  tsrs: Schema.String,
  skip: Schema.Array(Schema.String),
  targets: Schema.Array(Schema.String),
});

const PackageJson = Schema.Struct({ upstream: Upstream });

const Manifest = Schema.fromJsonString(PackageJson);

export type UpstreamPins = typeof Upstream.Type;

/** @internal */
export const manifestIn = Effect.fn("manifestIn")(function* manifestIn(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(directory, "package.json"));
  return yield* Schema.decodeEffect(Manifest)(text);
});
