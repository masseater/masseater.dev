import { Array, Effect, FileSystem, HashSet, Stream, String, pipe } from "effect";
import { Tar } from "effect/encoding";

import { captureAll } from "#/shared/text/index.ts";

import { UnityPackageUnreadable } from "./unity-package-unreadable.ts";

const unreadable =
  (path: string) =>
  (cause: unknown): UnityPackageUnreadable =>
    UnityPackageUnreadable.make({ path, cause });

const piped = <Failure, Requirements>(
  bytes: Stream.Stream<Uint8Array<ArrayBuffer>, Failure, Requirements>,
  transform: () => CompressionStream | DecompressionStream,
  path: string,
): Effect.Effect<Stream.Stream<Uint8Array, UnityPackageUnreadable>, never, Requirements> =>
  Effect.map(Stream.toReadableStreamEffect(bytes), (readable) =>
    Stream.fromReadableStream({
      evaluate: () => readable.pipeThrough(transform()),
      onError: unreadable(path),
    }),
  );

/** @internal */
export const tarEntries = Effect.fn("tarEntries")(function* openTar(path: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const archive = yield* piped(
    fileSystem.stream(path).pipe(Stream.map((chunk) => Uint8Array.from(chunk))),
    () => new DecompressionStream("gzip"),
    path,
  );
  return archive.pipe(
    Stream.pipeThroughChannel(Tar.decode<UnityPackageUnreadable>()),
    Stream.mapError(unreadable(path)),
    Stream.map(({ header, body }): Tar.Entry<UnityPackageUnreadable> => ({
      header,
      body: Stream.mapError(body, unreadable(path)),
    })),
  );
});

/** @internal */
export const writeTar = Effect.fn("writeTar")(function* writeTarArchive(
  destination: string,
  entries: Stream.Stream<Tar.Entry, UnityPackageUnreadable>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const tar = entries.pipe(
    Stream.pipeThroughChannel(Tar.encode<UnityPackageUnreadable>()),
    Stream.mapError(unreadable(destination)),
    Stream.map((chunk) => Uint8Array.from(chunk)),
  );
  const archive = yield* piped(tar, () => new CompressionStream("gzip"), destination);
  yield* Stream.run(archive, fileSystem.sink(destination));
});

interface Scan {
  readonly references: HashSet.HashSet<string>;
  readonly tail: string;
}

const REFERENCE_TAIL = -64;

const latin1 = new TextDecoder("latin1");

export const referencesIn = captureAll({ pattern: /guid: (?<guid>[0-9a-f]{32})/gu, name: "guid" });

const absorb = ({ references, tail }: Scan, chunk: Uint8Array): Scan => {
  const text = tail + latin1.decode(chunk);
  return {
    references: HashSet.union(references, HashSet.fromIterable(referencesIn(text))),
    tail: pipe(text, String.slice(REFERENCE_TAIL)),
  };
};

/** @internal */
export const scanBody = Effect.fn("scanBody")(function* scanReferences(
  entry: Tar.Entry<UnityPackageUnreadable>,
) {
  const { references } = yield* Stream.runFold(
    entry.body,
    (): Scan => ({ references: HashSet.empty(), tail: "" }),
    absorb,
  );
  return Array.fromIterable(references);
});
