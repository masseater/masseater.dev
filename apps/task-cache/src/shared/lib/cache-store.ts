import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Context, Effect } from "effect";

import { storeFailed } from "./store-failed.ts";

export type Limiter = Readonly<{
  limit: (options: Readonly<{ key: string }>) => Promise<Readonly<{ success: boolean }>>;
}>;

export type Range = Readonly<{ offset: number; length: number }>;

export type StoredObject = Readonly<{
  body: ReadableStream;
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

export type ObjectStore = Readonly<{
  get: (key: string, options: Readonly<{ range: Range }>) => Promise<StoredObject | null>;
  put: (key: string, value: Uint8Array<ArrayBuffer>) => Promise<unknown>;
  delete: (keys: readonly string[]) => Promise<void>;
}>;

export type CacheBindings = Readonly<{ DB: D1Database; BUCKET: ObjectStore; LIMITER: Limiter }>;

export type Store = Readonly<{ db: DrizzleD1Database; bucket: ObjectStore; limiter: Limiter }>;

export class CacheStore extends Context.Service<CacheStore, Store>()(
  "task-cache/shared/lib/cache-store/CacheStore",
) {}

export const cacheStoreOf = (bindings: CacheBindings): Store => ({
  db: drizzle(bindings.DB),
  bucket: bindings.BUCKET,
  limiter: bindings.LIMITER,
});

export const queried = Effect.fn("cacheStore.queried")(function* queried<Found>(
  query: (db: DrizzleD1Database) => Promise<Found>,
) {
  const { db } = yield* CacheStore;
  return yield* Effect.tryPromise({ try: () => query(db), catch: storeFailed });
});

export const inBucket = Effect.fn("cacheStore.inBucket")(function* inBucket<Found>(
  call: (bucket: ObjectStore) => Promise<Found>,
) {
  const { bucket } = yield* CacheStore;
  return yield* Effect.tryPromise({ try: () => call(bucket), catch: storeFailed });
});

export const limited = Effect.fn("cacheStore.limited")(function* limited(key: string) {
  const { limiter } = yield* CacheStore;
  const outcome = yield* Effect.promise(() => limiter.limit({ key }));
  return !outcome.success;
});
