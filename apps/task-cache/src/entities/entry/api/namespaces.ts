import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, Effect } from "effect";

import { publicNamespaces } from "#/entities/entry/model/entries.table.ts";
import { storeFailed } from "#/shared/lib/store-failed.ts";
import type { StoreFailed } from "#/shared/lib/store-failed.ts";

const db = drizzle(env.DB);

export const isPublic = (name: string): Effect.Effect<boolean, StoreFailed> =>
  Effect.tryPromise({
    try: () => db.select().from(publicNamespaces).where(eq(publicNamespaces.name, name)),
    catch: storeFailed,
  }).pipe(Effect.map(Arr.isReadonlyArrayNonEmpty));

const opened = (name: string): Effect.Effect<void, StoreFailed> =>
  Effect.tryPromise({
    try: () => db.insert(publicNamespaces).values({ name }).onConflictDoNothing(),
    catch: storeFailed,
  }).pipe(Effect.asVoid);

const closed = (name: string): Effect.Effect<void, StoreFailed> =>
  Effect.tryPromise({
    try: () => db.delete(publicNamespaces).where(eq(publicNamespaces.name, name)),
    catch: storeFailed,
  }).pipe(Effect.asVoid);

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
