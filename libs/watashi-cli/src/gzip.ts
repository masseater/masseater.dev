import { Effect } from "effect";

const gzip = (text: string): Effect.Effect<Uint8Array> =>
  Effect.promise(() => {
    const compressed = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Response(compressed).bytes();
  });

/** @internal */
export { gzip };
