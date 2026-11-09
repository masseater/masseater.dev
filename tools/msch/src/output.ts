import { Effect, Schema, Stdio, Stream } from "effect";

const taggedError = Schema.TaggedError;

class ProblemsFound extends taggedError<ProblemsFound, { readonly brand: unique symbol }>()(
  "ProblemsFound",
  {
    count: Schema.Finite,
  },
) {}

/** @internal */
const writeStdout = Effect.fn("writeStdout")(function* writeStdout(text: string) {
  const stdio = yield* Stdio.Stdio;
  yield* Stream.make(text).pipe(Stream.run(stdio.stdout()), Effect.orDie);
});

export { ProblemsFound, writeStdout };
