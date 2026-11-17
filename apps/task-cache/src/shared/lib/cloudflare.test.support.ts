import { makeD1 } from "@masseater.dev/d1-test";
import { Effect, Option, pipe } from "effect";

interface Range {
  readonly offset: number;
  readonly length: number;
}

interface Stores {
  readonly objects: Map<string, Uint8Array>;
  flooded: boolean;
}

const stores: Stores = { objects: new Map(), flooded: false };

const database = makeD1({
  migrations: new URL("../../../drizzle/", import.meta.url).href,
  tables: ["entries", "public_namespaces", "uploads", "object_reads"],
});

const ranged = (bytes: Uint8Array, range: Range): Uint8Array<ArrayBuffer> =>
  new Uint8Array(bytes.subarray(range.offset, range.offset + range.length));

const BUCKET = {
  put: (key: string, value: Uint8Array): Promise<object> => {
    stores.objects.set(key, new Uint8Array(value));
    return Promise.resolve({});
  },
  get: (key: string, options: Readonly<{ range: Range }>): Promise<object | null> => {
    const found = pipe(
      Option.fromNullishOr(stores.objects.get(key)),
      Option.map((stored) => ranged(stored, options.range)),
      Option.map((bytes) => ({
        body: new Response(bytes).body,
        arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(bytes.buffer),
      })),
    );
    return Promise.resolve(Option.getOrNull(found));
  },
  delete: (keys: readonly string[]): Promise<void> => {
    for (const key of keys) {
      stores.objects.delete(key);
    }
    return Promise.resolve();
  },
};

const LIMITER = {
  limit: (): Promise<{ success: boolean }> => Promise.resolve({ success: !stores.flooded }),
};

export const env = { DB: database.env.DB, BUCKET, LIMITER };

export const objectCount = (): number => stores.objects.size;

export const flood: Effect.Effect<void> = Effect.sync(() => {
  stores.flooded = true;
});

export const resetStores = database.resetDatabase.pipe(
  Effect.andThen(
    Effect.sync(() => {
      stores.objects.clear();
      stores.flooded = false;
    }),
  ),
);

export const { closeDatabase } = database;
