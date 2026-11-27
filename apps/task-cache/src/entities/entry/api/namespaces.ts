import { eq } from "drizzle-orm";
import { Array as Arr, Effect } from "effect";

import { publicNamespaces } from "#/entities/entry/model/entries.table.ts";
import { queried } from "#/shared/lib/cache-store.ts";
import type { CacheStore } from "#/shared/lib/cache-store.ts";
import type { StoreFailed } from "#/shared/lib/store-failed.ts";

export const isPublic = (name: string): Effect.Effect<boolean, StoreFailed, CacheStore> =>
  queried((db) => db.select().from(publicNamespaces).where(eq(publicNamespaces.name, name))).pipe(
    Effect.map(Arr.isReadonlyArrayNonEmpty),
  );

const opened = (name: string): Effect.Effect<void, StoreFailed, CacheStore> =>
  queried((db) => db.insert(publicNamespaces).values({ name }).onConflictDoNothing()).pipe(
    Effect.asVoid,
  );

const closed = (name: string): Effect.Effect<void, StoreFailed, CacheStore> =>
  queried((db) => db.delete(publicNamespaces).where(eq(publicNamespaces.name, name))).pipe(
    Effect.asVoid,
  );

export const setPublic = Effect.fn("namespaces.setPublic")(function* setPublic(
  name: string,
  open: boolean,
) {
  const current = yield* isPublic(name);
  if (current === open) {
    return;
  }
  if (open) {
    yield* opened(name);
    return;
  }
  yield* closed(name);
});
