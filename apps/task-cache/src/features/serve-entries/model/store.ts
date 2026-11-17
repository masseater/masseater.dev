import { Array as Arr, Effect, Option, pipe } from "effect";

import { blobIdOf, dropOverflow, save } from "#/entities/entry/index.ts";
import { digestOf, joined } from "#/shared/lib/bytes.ts";
import { nowSeconds } from "#/shared/lib/clock.ts";
import { decodeStored, encodeStoredReply } from "#/shared/lib/envelope.ts";
import { Malformed } from "#/shared/lib/malformed.ts";
import { partsOf } from "#/shared/lib/multipart.ts";
import type { Part } from "#/shared/lib/multipart.ts";
import { cbor } from "#/shared/lib/responses.ts";

const METADATA = "metadata";
const BLOB = "blob";

export interface Upload {
  readonly namespace: string;
  readonly contentType: string;
  readonly body: Uint8Array;
}

const named = (parts: readonly Part[], name: string): Option.Option<readonly Uint8Array[]> =>
  pipe(
    Arr.findFirst(parts, (part) => part.name === name),
    Option.map((part) => part.chunks),
  );

export const storeEntry = Effect.fn("serveEntries.storeEntry")(function* storeEntry(
  upload: Upload,
) {
  const parts = yield* partsOf(upload.contentType, upload.body);
  const metadata = yield* Option.match(named(parts, METADATA), {
    onNone: () => Effect.fail(Malformed.make({ reason: "metadata part missing" })),
    onSome: (chunks) => decodeStored(joined(chunks)),
  });
  const key = yield* digestOf(metadata.key);
  const createdAt = yield* nowSeconds;
  const saved = yield* save({
    namespace: upload.namespace,
    key,
    value: metadata.value,
    blob: named(parts, BLOB),
    createdAt,
  });
  yield* dropOverflow(upload.namespace, key);
  return pipe(saved, blobIdOf, encodeStoredReply, cbor);
});
