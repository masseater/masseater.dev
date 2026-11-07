import { Effect, FileSystem, Path, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

const CACHE_DIRECTORY = ".cache/images";

const modelPreviewUrl = (id: string): string =>
  `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=512`;

const filesUrl = (id: string): string => `https://api.polyhaven.com/files/${id}`;

const Jpg = Schema.Struct({ url: Schema.String });

const Resolution = Schema.Struct({ jpg: Jpg });

const Diffuse = Schema.Struct({ "1k": Resolution });

const TextureFiles = Schema.Struct({ Diffuse });

type AssetType = "model" | "texture";

const fetchBytes = Effect.fn("fetchBytes")(function* fetchBytes(url: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.get(url).pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
  const buffer = yield* response.arrayBuffer;
  return new Uint8Array(buffer);
});

const textureUrl = Effect.fn("textureUrl")(function* textureUrl(id: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client
    .get(filesUrl(id))
    .pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
  const files = yield* HttpClientResponse.schemaBodyJson(TextureFiles)(response);
  return files.Diffuse["1k"].jpg.url;
});

const SOURCES = {
  model: (id: string) => Effect.succeed(modelPreviewUrl(id)),
  texture: textureUrl,
} as const;

/** @internal */
const imageOf = Effect.fn("imageOf")(function* cachedImage({
  id,
  type,
}: Readonly<{ id: string; type: AssetType }>) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const file = path.join(CACHE_DIRECTORY, `${type}-${id}`);
  if (yield* fileSystem.exists(file)) {
    return yield* fileSystem.readFile(file);
  }
  const url = yield* SOURCES[type](id);
  const bytes = yield* fetchBytes(url);
  yield* fileSystem.makeDirectory(CACHE_DIRECTORY, { recursive: true });
  yield* fileSystem.writeFile(file, bytes);
  return bytes;
});

export { imageOf };
export type { AssetType };
