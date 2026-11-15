import { Effect, FileSystem } from "effect";
import { Digest } from "effect/crypto";
import { HttpClient, HttpClientResponse } from "effect/http";

type Saved = Readonly<{ url: string; to: string }>;

const fetchBytes = Effect.fn("download.fetchBytes")(function* fetchBytes(url: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* Effect.flatMap(client.get(url), HttpClientResponse.filterStatusOk);
  const body = yield* response.arrayBuffer;
  return new Uint8Array(body);
});

const sha256 = Effect.fn("download.sha256")(function* sha256(bytes: Uint8Array) {
  const digest = yield* Digest.Digest;
  return yield* digest.digestHex(Digest.sha256, bytes);
});

const save = Effect.fn("download.save")(function* save({ url, to }: Saved) {
  const fileSystem = yield* FileSystem.FileSystem;
  const bytes = yield* fetchBytes(url);
  yield* fileSystem.writeFile(to, bytes);
});

/** @internal */
export { fetchBytes, save, sha256 };
/** @internal */
export type { Saved };
