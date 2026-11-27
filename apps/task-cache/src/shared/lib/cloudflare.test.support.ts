import { makeD1, makeR2 } from "@masseater.dev/d1-test";
import { Effect, MutableRef, Option, pipe } from "effect";

import { CacheStore, cacheStoreOf } from "./cache-store.ts";
import type { Limiter, ObjectStore, StoredObject } from "./cache-store.ts";

const database = makeD1({
  migrations: new URL("../../../drizzle/", import.meta.url).href,
  tables: ["entries", "public_namespaces", "uploads", "object_reads"],
});

const objects = makeR2();

const flooded = MutableRef.make(false);

const LIMITER: Limiter = {
  limit: () => Promise.resolve({ success: !MutableRef.get(flooded) }),
};

type Readable = Readonly<{ arrayBuffer: () => Promise<ArrayBuffer> }>;

const storedOf = (object: Readable): Effect.Effect<StoredObject> =>
  Effect.promise(() => object.arrayBuffer()).pipe(
    Effect.map((bytes) => ({
      body: new Blob([bytes]).stream(),
      arrayBuffer: () => Promise.resolve(bytes),
    })),
  );

const readObject = (object: Readable | null): Effect.Effect<StoredObject | null> =>
  pipe(
    Option.fromNullishOr(object),
    Option.map(storedOf),
    Effect.transposeOption,
    Effect.map(Option.getOrNull),
  );

const bucket = objects.bucket.pipe(
  Effect.map((found): ObjectStore => ({
    get: (key, options) =>
      Effect.runPromise(
        Effect.promise(() => found.get(key, options)).pipe(Effect.flatMap(readObject)),
      ),
    put: (key, value) => found.put(key, value),
    delete: (keys) => found.delete([...keys]),
  })),
);

const store = Effect.all(
  { DB: database.database, BUCKET: bucket },
  { concurrency: "unbounded" },
).pipe(Effect.map((bindings) => cacheStoreOf({ ...bindings, LIMITER })));

export const withStore = <Success, Failure>(
  effect: Effect.Effect<Success, Failure, CacheStore>,
): Effect.Effect<Success, Failure> => effect.pipe(Effect.provideServiceEffect(CacheStore, store));

export const { objectCount } = objects;

export const objectReadRows: Effect.Effect<number> = database.database.pipe(
  Effect.flatMap((db) => Effect.promise(() => db.prepare("SELECT id FROM object_reads").all())),
  Effect.map(({ results }) => results.length),
);

export const flood: Effect.Effect<void> = Effect.sync(() => {
  MutableRef.set(flooded, true);
});

export const resetStores = Effect.all([database.resetDatabase, objects.resetBucket], {
  concurrency: "unbounded",
}).pipe(
  Effect.andThen(
    Effect.sync(() => {
      MutableRef.set(flooded, false);
    }),
  ),
);

export const closeDatabase = Effect.all([database.closeDatabase, objects.closeBucket], {
  concurrency: "unbounded",
}).pipe(Effect.asVoid);
