import { Array, Effect, FileSystem, HashSet, Stream, String, pipe } from "effect";
import { createTarDecoder } from "modern-tar";
import type { ParsedTarEntry } from "modern-tar";

import { collectBytes } from "#shared/bytes";
import { captureAll } from "#shared/text";

import { UnityPackageUnreadable } from "./unity-package-unreadable.ts";

const unreadable =
  (path: string) =>
  (cause: unknown): UnityPackageUnreadable =>
    UnityPackageUnreadable.make({ path, cause });

/** @internal */
const tarEntries = Effect.fn("tarEntries")(function* openTar(path: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const readable = yield* Stream.toReadableStreamEffect(
    fileSystem.stream(path).pipe(Stream.map((chunk) => Uint8Array.from(chunk))),
  );
  return Stream.fromReadableStream({
    evaluate: () =>
      readable.pipeThrough(new DecompressionStream("gzip")).pipeThrough(createTarDecoder()),
    onError: unreadable(path),
  });
});

/** @internal */
const bodyOf = Effect.fn("bodyOf")(function* readBody(path: string, entry: ParsedTarEntry) {
  return yield* collectBytes(
    Stream.fromReadableStream({ evaluate: () => entry.body, onError: unreadable(path) }),
  );
});

/** @internal */
const skip = Effect.fn("skip")(function* skipBody(entry: ParsedTarEntry) {
  yield* Effect.promise(() => entry.body.cancel());
});

interface Scan {
  readonly references: HashSet.HashSet<string>;
  readonly tail: string;
}

const REFERENCE_TAIL = -64;

const latin1 = new TextDecoder("latin1");

const referencesIn = captureAll({ pattern: /guid: (?<guid>[0-9a-f]{32})/gu, name: "guid" });

const absorb = ({ references, tail }: Scan, chunk: Uint8Array): Scan => {
  const text = tail + latin1.decode(chunk);
  return {
    references: HashSet.union(references, HashSet.fromIterable(referencesIn(text))),
    tail: pipe(text, String.slice(REFERENCE_TAIL)),
  };
};

/** @internal */
const scanBody = Effect.fn("scanBody")(function* scanReferences(
  path: string,
  entry: ParsedTarEntry,
) {
  const { references } = yield* Stream.runFold(
    Stream.fromReadableStream({ evaluate: () => entry.body, onError: unreadable(path) }),
    (): Scan => ({ references: HashSet.empty(), tail: "" }),
    absorb,
  );
  return Array.fromIterable(references);
});

export { bodyOf, referencesIn, scanBody, skip, tarEntries };
