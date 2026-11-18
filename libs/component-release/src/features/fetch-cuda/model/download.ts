import { Effect, FileSystem, Schema, Stream } from "effect";
import { Digest } from "effect/crypto";
import { HttpClient, HttpClientResponse } from "effect/http";

const taggedError = Schema.TaggedError;

/** @internal */
export class FetchFailed extends taggedError<FetchFailed, { readonly brand: unique symbol }>()(
  "FetchFailed",
  { message: Schema.String },
  { identifier: "FetchFailed" },
) {}

const failed =
  (url: string) =>
  (cause: Readonly<{ message: string }>): FetchFailed =>
    FetchFailed.make({ message: `${url}: ${cause.message}` });

/** @internal */
export const fetchText = Effect.fn("cuda.fetch-text")(function* fetchText(url: string) {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const response = yield* client.get(url).pipe(Effect.mapError(failed(url)));
  return yield* response.text.pipe(Effect.mapError(failed(url)));
});

const saveTo = Effect.fn("cuda.save")(function* saveTo(url: string, file: string) {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const fileSystem = yield* FileSystem.FileSystem;
  yield* client
    .get(url)
    .pipe(
      HttpClientResponse.stream,
      Stream.run(fileSystem.sink(file)),
      Effect.mapError(failed(url)),
    );
});

/** @internal */
export interface Download {
  readonly url: string;
  readonly file: string;
  readonly sha256: string;
}

/** @internal */
export const download = Effect.fn("cuda.download")(function* download({
  url,
  file,
  sha256,
}: Download) {
  const fileSystem = yield* FileSystem.FileSystem;
  const digest = yield* Digest.Digest;
  yield* saveTo(url, file);
  const bytes = yield* fileSystem.readFile(file);
  const actual = yield* digest.digestHex(Digest.sha256, bytes).pipe(Effect.mapError(failed(url)));
  if (actual !== sha256) {
    return yield* FetchFailed.make({ message: `${url}: SHA-256 ${actual} is not ${sha256}` });
  }
  return file;
});
