import { Array as Arr, Effect, Option, pipe } from "effect";

import { blobIdOf, isInline, newest, valueOf } from "#/entities/entry/index.ts";
import type { Entry } from "#/entities/entry/index.ts";
import { spendObjectReads } from "#/entities/spending/index.ts";
import { Limits } from "#/shared/config/index.ts";
import { digestOf } from "#/shared/lib/bytes.ts";
import type { CacheStore } from "#/shared/lib/cache-store.ts";
import { decodeLookup, encodeCandidates } from "#/shared/lib/envelope.ts";
import type { Candidate } from "#/shared/lib/envelope.ts";
import { STATUS, cbor, status } from "#/shared/lib/responses.ts";
import type { StoreFailed } from "#/shared/lib/store-failed.ts";

const NOTHING = 0;
const FIRST = 0;
const SELF = 1;

const withinBudget =
  (responseBytes: number) =>
  (found: readonly Entry[]): readonly Entry[] => {
    const totals = Arr.scan(found, NOTHING, (bytes, entry) => bytes + entry.valueBytes);
    return pipe(
      Arr.zip(found, Arr.drop(totals, SELF)),
      Arr.takeWhile(([, bytes], index) => index === FIRST || bytes <= responseBytes),
      Arr.map(([entry]) => entry),
    );
  };

const readable = Effect.fn("serveEntries.readable")(function* readable(found: readonly Entry[]) {
  const inline = pipe(found, Arr.filter(isInline));
  const stored = found.length - inline.length;
  if (stored === NOTHING) {
    return found;
  }
  const allowed = yield* spendObjectReads(stored);
  if (allowed) {
    return found;
  }
  return inline;
});

const candidateOf = (
  entry: Entry,
): Effect.Effect<Option.Option<Candidate>, StoreFailed, CacheStore> =>
  valueOf(entry).pipe(
    Effect.map(Option.map((value): Candidate => ({ value, blobId: blobIdOf(entry) }))),
  );

export const fetchEntries = Effect.fn("serveEntries.fetchEntries")(function* fetchEntries(
  namespace: string,
  body: Uint8Array,
) {
  const lookup = yield* decodeLookup(body);
  const key = yield* digestOf(lookup.key);
  const found = yield* newest(namespace, key);
  const { responseBytes } = yield* Limits;
  const usable = yield* readable(withinBudget(responseBytes)(found));
  const read = yield* Effect.forEach(usable, candidateOf, { concurrency: "unbounded" });
  const candidates = Arr.getSomes(read);
  if (!Arr.isReadonlyArrayNonEmpty(candidates)) {
    return status(STATUS.notFound);
  }
  return cbor(encodeCandidates(candidates));
});
