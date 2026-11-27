import { Array as Arr, Effect, Number as Num, Result, pipe } from "effect";
import { Base64, Hex } from "effect/encoding";

import { storeFailed } from "./store-failed.ts";
import type { StoreFailed } from "./store-failed.ts";

const SHA_256 = "SHA-256";

export const byteLength = (chunks: readonly Uint8Array[]): number =>
  pipe(
    chunks,
    Arr.map((chunk) => chunk.length),
    Num.sumAll,
  );

export const joined = (chunks: readonly Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const all = new Uint8Array(byteLength(chunks));
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  return all;
};

export const digestOf = (bytes: Uint8Array): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest(SHA_256, new Uint8Array(bytes))).pipe(
    Effect.map((digest) => Hex.encode(new Uint8Array(digest))),
  );

export const fromBase64 = (text: string): Effect.Effect<Uint8Array, StoreFailed> =>
  Result.match(Base64.decode(text), {
    onFailure: (error) => error.pipe(storeFailed, Effect.fail),
    onSuccess: (bytes) => Effect.succeed(bytes),
  });
