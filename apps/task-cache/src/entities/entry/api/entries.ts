import { and, asc, desc, eq, inArray, lt, sum } from "drizzle-orm";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { Base64 } from "effect/encoding";

import { entries } from "#/entities/entry/model/entries.table.ts";
import { Limits } from "#/shared/config/index.ts";
import { byteLength, fromBase64, joined } from "#/shared/lib/bytes.ts";
import { inBucket, queried } from "#/shared/lib/cache-store.ts";
import type { CacheStore, StoredObject } from "#/shared/lib/cache-store.ts";
import { StoreFailed, storeFailed } from "#/shared/lib/store-failed.ts";

export type Entry = typeof entries.$inferSelect;

export interface Incoming {
  readonly namespace: string;
  readonly key: string;
  readonly value: Uint8Array;
  readonly blob: Option.Option<readonly Uint8Array[]>;
  readonly createdAt: number;
}

export interface Blob {
  readonly body: ReadableStream;
  readonly length: number;
}

const REMOVAL_BATCH = 90;
const NOTHING = 0;
const NO_CHUNKS: readonly Uint8Array[] = [];

const sized = {
  id: entries.id,
  namespace: entries.namespace,
  valueBytes: entries.valueBytes,
  blobBytes: entries.blobBytes,
};

export type Sized = Pick<Entry, keyof typeof sized>;

const objectOf = (entry: Pick<Entry, "id" | "namespace">): string =>
  `${entry.namespace}/${entry.id}`;

const blobBytesOf = (entry: Pick<Entry, "blobBytes">): Option.Option<number> =>
  Option.fromNullishOr(entry.blobBytes);

export const sizeOf = (entry: Pick<Entry, "blobBytes" | "valueBytes">): number =>
  entry.valueBytes + Option.getOrElse(blobBytesOf(entry), () => NOTHING);

export const isInline = (entry: Pick<Entry, "value">): boolean =>
  Option.isSome(Option.fromNullishOr(entry.value));

export const blobIdOf = (entry: Pick<Entry, "blobBytes" | "id" | "key">): Option.Option<string> =>
  pipe(
    blobBytesOf(entry),
    Option.map(() => `${String(entry.id)}-${entry.key}`),
  );

export const newest = Effect.fn("entries.newest")(function* newest(namespace: string, key: string) {
  const { entriesPerKey } = yield* Limits;
  return yield* queried((db) =>
    db
      .select()
      .from(entries)
      .where(and(eq(entries.namespace, namespace), eq(entries.key, key)))
      .orderBy(desc(entries.id))
      .limit(entriesPerKey),
  );
});

export type BlobRef = Readonly<{ id: number; key: string }>;

export const entryOf = Effect.fn("entries.entryOf")(function* entryOf(
  namespace: string,
  { id, key }: BlobRef,
) {
  const found = yield* queried((db) =>
    db
      .select()
      .from(entries)
      .where(and(eq(entries.namespace, namespace), eq(entries.id, id), eq(entries.key, key))),
  );
  return Arr.head(found);
});

const objectRange = (
  object: string,
  range: Readonly<{ offset: number; length: number }>,
): Effect.Effect<Option.Option<StoredObject>, StoreFailed, CacheStore> =>
  inBucket((bucket) => bucket.get(object, { range })).pipe(Effect.map(Option.fromNullishOr));

const storedValue = Effect.fn("entries.storedValue")(function* storedValue(entry: Entry) {
  const found = yield* objectRange(objectOf(entry), { offset: NOTHING, length: entry.valueBytes });
  if (Option.isNone(found)) {
    return Option.none<Uint8Array>();
  }
  const buffer = yield* Effect.tryPromise({
    try: () => found.value.arrayBuffer(),
    catch: storeFailed,
  });
  return Option.some(new Uint8Array(buffer));
});

export const valueOf = (
  entry: Entry,
): Effect.Effect<Option.Option<Uint8Array>, StoreFailed, CacheStore> =>
  Option.match(Option.fromNullishOr(entry.value), {
    onNone: () => storedValue(entry),
    onSome: (text) => fromBase64(text).pipe(Effect.asSome),
  });

const blobOffset = (entry: Entry): number => {
  if (isInline(entry)) {
    return NOTHING;
  }
  return entry.valueBytes;
};

export const blobOf = Effect.fn("entries.blobOf")(function* blobOf(entry: Entry) {
  const length = blobBytesOf(entry);
  if (Option.isNone(length)) {
    return Option.none<Blob>();
  }
  const found = yield* objectRange(objectOf(entry), {
    offset: blobOffset(entry),
    length: length.value,
  });
  return pipe(
    found,
    Option.map((object): Blob => ({ body: object.body, length: length.value })),
  );
});

const objectFor = (incoming: Incoming, inline: boolean): Option.Option<Uint8Array<ArrayBuffer>> => {
  if (inline) {
    return pipe(incoming.blob, Option.map(joined));
  }
  const blob = Option.getOrElse(incoming.blob, () => NO_CHUNKS);
  return Option.some(joined([incoming.value, ...blob]));
};

const inlineValue = (incoming: Incoming, inline: boolean): Option.Option<string> =>
  pipe(
    Option.some(incoming.value),
    Option.filter(() => inline),
    Option.map(Base64.encode),
  );

export const remove = Effect.fn("entries.remove")(function* remove(victims: readonly Sized[]) {
  if (!Arr.isReadonlyArrayNonEmpty(victims)) {
    return;
  }
  const objects = pipe(victims, Arr.map(objectOf));
  const ids = pipe(
    victims,
    Arr.map((victim) => victim.id),
  );
  yield* inBucket((bucket) => bucket.delete(objects));
  yield* queried((db) => db.delete(entries).where(inArray(entries.id, ids)));
});

const insert = Effect.fn("entries.insert")(function* insert(incoming: Incoming, inline: boolean) {
  const rows = yield* queried((db) =>
    db
      .insert(entries)
      .values({
        namespace: incoming.namespace,
        key: incoming.key,
        value: pipe(inlineValue(incoming, inline), Option.getOrNull),
        valueBytes: incoming.value.length,
        blobBytes: pipe(incoming.blob, Option.map(byteLength), Option.getOrNull),
        createdAt: incoming.createdAt,
      })
      .returning(),
  );
  return yield* Arr.match(rows, {
    onEmpty: () => Effect.fail(StoreFailed.make({ message: "entry row missing" })),
    onNonEmpty: ([saved]) => Effect.succeed(saved),
  });
});

export const save = Effect.fn("entries.save")(function* save(incoming: Incoming) {
  const { inlineValueBytes } = yield* Limits;
  const inline = incoming.value.length <= inlineValueBytes;
  const saved = yield* insert(incoming, inline);
  const content = objectFor(incoming, inline);
  if (Option.isSome(content)) {
    yield* inBucket((bucket) => bucket.put(objectOf(saved), content.value)).pipe(
      Effect.tapError(() => Effect.ignore(remove([saved]))),
    );
  }
  return saved;
});

export const dropOverflow = Effect.fn("entries.dropOverflow")(function* dropOverflow(
  namespace: string,
  key: string,
) {
  const { entriesPerKey } = yield* Limits;
  const overflow = yield* queried((db) =>
    db
      .select(sized)
      .from(entries)
      .where(and(eq(entries.namespace, namespace), eq(entries.key, key)))
      .orderBy(desc(entries.id))
      .limit(REMOVAL_BATCH)
      .offset(entriesPerKey),
  );
  yield* remove(overflow);
});

export const olderThan = (
  cutoff: number,
): Effect.Effect<readonly Sized[], StoreFailed, CacheStore> =>
  queried((db) =>
    db
      .select(sized)
      .from(entries)
      .where(lt(entries.createdAt, cutoff))
      .orderBy(asc(entries.id))
      .limit(REMOVAL_BATCH),
  );

export const oldest: Effect.Effect<readonly Sized[], StoreFailed, CacheStore> = queried((db) =>
  db.select(sized).from(entries).orderBy(asc(entries.id)).limit(REMOVAL_BATCH),
);

const summed = (total: number | null): number =>
  Option.getOrElse(Option.fromNullishOr(total), () => NOTHING);

export const storedBytes: Effect.Effect<number, StoreFailed, CacheStore> = queried((db) =>
  db
    .select({
      values: sum(entries.valueBytes).mapWith(Number),
      blobs: sum(entries.blobBytes).mapWith(Number),
    })
    .from(entries),
).pipe(
  Effect.map(Arr.head),
  Effect.map(
    Option.match({
      onNone: () => NOTHING,
      onSome: (totals) => summed(totals.values) + summed(totals.blobs),
    }),
  ),
);

export const REMOVED_AT_ONCE = REMOVAL_BATCH;
