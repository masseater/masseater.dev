import { Array, Effect, FileSystem, Option, pipe } from "effect";
import { Decompress } from "fzstd";

import { collectBytes } from "#shared/bytes";
import { PreviewFailed, pixelsPreview } from "#shared/preview";

import { blendThumbnail } from "./blend-thumbnail.ts";

const PREFIX_BYTES = 4_194_304;
const ZSTD_MAGIC = ["40", "181", "47", "253"] as const;
const GZIP_MAGIC = ["31", "139"] as const;
const FILE_START = 0;
const SEPARATOR = ",";

const startsWith =
  (magic: readonly string[]) =>
  (bytes: Uint8Array): boolean =>
    bytes.subarray(FILE_START, magic.length).join(SEPARATOR) === pipe(magic, Array.join(SEPARATOR));

const isZstd = startsWith(ZSTD_MAGIC);

const isGzip = startsWith(GZIP_MAGIC);

const unzstdPrefix = (path: string, bytes: Uint8Array): Effect.Effect<Uint8Array, PreviewFailed> =>
  Effect.tryPromise({
    try: () => {
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      const stream = new Decompress((chunk) => chunks.push(Uint8Array.from(chunk)));
      stream.push(bytes);
      return new Blob(chunks).bytes();
    },
    catch: (cause) => PreviewFailed.make({ path, cause }),
  });

const gunzipFile = Effect.fn("gunzipFile")(function* gunzipFile(path: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const compressed = yield* fileSystem.readFile(path);
  return yield* Effect.tryPromise({
    try: () =>
      new Response(
        new Blob([Uint8Array.from(compressed)])
          .stream()
          .pipeThrough(new DecompressionStream("gzip")),
      ).bytes(),
    catch: (cause) => PreviewFailed.make({ path, cause }),
  });
});

const plainPrefix = Effect.fn("plainPrefix")(function* plainPrefix(path: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const prefix = yield* collectBytes(fileSystem.stream(path, { bytesToRead: PREFIX_BYTES }));
  if (isZstd(prefix)) {
    return yield* unzstdPrefix(path, prefix);
  }
  if (isGzip(prefix)) {
    return yield* gunzipFile(path);
  }
  return prefix;
});

/** @internal */
const blendPreview = Effect.fn("blendPreview")(function* blendPreview(path: string) {
  const plain = yield* plainPrefix(path);
  return yield* Option.match(blendThumbnail(plain), {
    onNone: () => Effect.succeedNone,
    onSome: (thumbnail) => Effect.asSome(pixelsPreview(path, thumbnail)),
  });
});

export { blendPreview };
