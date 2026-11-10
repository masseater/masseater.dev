import { Effect, FileSystem, Ref, Stream, pipe } from "effect";
import { Hex } from "effect/encoding";

const ALGORITHM = "SHA-256";
const BLOCK_BYTES = 1_048_576;
const START = 0;

interface Progress {
  readonly digest: Uint8Array;
  readonly pending: Uint8Array;
}

const NOTHING: Progress = { digest: new Uint8Array(), pending: new Uint8Array() };

const joined = (head: Uint8Array, tail: Uint8Array): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(head.length + tail.length);
  bytes.set(head, START);
  bytes.set(tail, head.length);
  return bytes;
};

const chained = (digest: Uint8Array, block: Uint8Array): Effect.Effect<Uint8Array> =>
  Effect.promise(() => crypto.subtle.digest(ALGORITHM, joined(digest, block))).pipe(
    Effect.map((next) => new Uint8Array(next)),
  );

const absorb = ({ digest, pending }: Progress, chunk: Uint8Array): Effect.Effect<Progress> => {
  const bytes = joined(pending, chunk);
  if (bytes.length < BLOCK_BYTES) {
    return Effect.succeed({ digest, pending: bytes });
  }
  return chained(digest, bytes.subarray(START, BLOCK_BYTES)).pipe(
    Effect.flatMap((next) =>
      absorb({ digest: next, pending: NOTHING.pending }, bytes.subarray(BLOCK_BYTES)),
    ),
  );
};

/** @internal */
const digestWith = Effect.fn("digestWith")(function* digestWith<Failure, Requirements>(
  write: (
    feed: (chunk: Uint8Array) => Effect.Effect<void>,
  ) => Effect.Effect<void, Failure, Requirements>,
) {
  const progress = yield* Ref.make(NOTHING);
  yield* write((chunk) =>
    Ref.get(progress).pipe(
      Effect.flatMap((current) => absorb(current, chunk)),
      Effect.flatMap((next) => Ref.set(progress, next)),
    ),
  );
  const { digest, pending } = yield* Ref.get(progress);
  const last = yield* chained(digest, pending);
  return Hex.encode(last);
});

/** @internal */
const digestOfFile = Effect.fn("digestOfFile")(function* digestOfFile(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* digestWith((feed) => pipe(fileSystem.stream(file), Stream.runForEach(feed)));
});

export { digestOfFile, digestWith };
