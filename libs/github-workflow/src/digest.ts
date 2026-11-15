import { Array as Arr, Effect, pipe } from "effect";
import { Hex } from "effect/encoding";

const sha256Of = (parts: readonly Uint8Array[]): Effect.Effect<string> =>
  Effect.promise(() =>
    new Blob(
      pipe(
        parts,
        Arr.map((part) => new Uint8Array(part)),
      ),
    ).arrayBuffer(),
  ).pipe(
    Effect.flatMap((bytes) => Effect.promise(() => crypto.subtle.digest("SHA-256", bytes))),
    Effect.map((digest) => Hex.encode(new Uint8Array(digest))),
  );

export { sha256Of };
