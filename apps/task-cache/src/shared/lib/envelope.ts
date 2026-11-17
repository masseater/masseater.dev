import { decode, encode } from "cborg";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { malformed } from "./malformed.ts";
import type { Malformed } from "./malformed.ts";

const Lookup = Schema.Struct({ key: Schema.Uint8Array, secondary_key: Schema.Uint8Array });

const Stored = Schema.Struct({ ...Lookup.fields, value: Schema.Uint8Array });

const decodeCbor = (bytes: Uint8Array): Effect.Effect<unknown, Malformed> =>
  Effect.try({ try: (): unknown => decode(bytes), catch: malformed });

export const decodeLookup = (bytes: Uint8Array): Effect.Effect<typeof Lookup.Type, Malformed> =>
  decodeCbor(bytes).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Lookup)),
    Effect.mapError(malformed),
  );

export const decodeStored = (bytes: Uint8Array): Effect.Effect<typeof Stored.Type, Malformed> =>
  decodeCbor(bytes).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Stored)),
    Effect.mapError(malformed),
  );

export interface Candidate {
  readonly value: Uint8Array;
  readonly blobId: Option.Option<string>;
}

const wireOf = ({ value, blobId }: Candidate): object => ({
  value,
  blob_id: Option.getOrNull(blobId),
});

export const encodeCandidates = (candidates: readonly Candidate[]): Uint8Array<ArrayBuffer> => {
  const entries = pipe(candidates, Arr.map(wireOf));
  return new Uint8Array(encode({ kind: "exact", entries }));
};

export const encodeStoredReply = (blobId: Option.Option<string>): Uint8Array<ArrayBuffer> =>
  new Uint8Array(encode({ blob_id: Option.getOrNull(blobId) }));
