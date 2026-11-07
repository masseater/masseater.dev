import { Array, Effect, Stream, pipe } from "effect";

/** @internal */
const collectBytes = Effect.fn("collectBytes")(function* collectBytes<Failure, Requirements>(
  stream: Stream.Stream<Uint8Array, Failure, Requirements>,
) {
  const chunks = yield* Stream.runCollect(stream);
  return yield* Effect.promise(() =>
    new Blob(
      pipe(
        chunks,
        Array.map((chunk) => Uint8Array.from(chunk)),
      ),
    ).bytes(),
  );
});

export { collectBytes };
