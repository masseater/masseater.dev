import { makeD1 } from "@masseater.dev/d1-test";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Effect } from "effect";

import { CatalogDb, catalogDbOf } from "./catalog-db.server.ts";
import type { CatalogRelations } from "./catalog-db.server.ts";

const testD1 = makeD1({
  migrations: new URL("../../../drizzle/", import.meta.url).href,
  tables: ["part_staff", "part", "person_alias", "song_alias", "person", "song", "video"],
});

export const { closeDatabase, database, resetDatabase } = testD1;

export const catalog: Effect.Effect<DrizzleD1Database<CatalogRelations>> = database.pipe(
  Effect.map(catalogDbOf),
);

export const withCatalog = <Success, Failure>(
  effect: Effect.Effect<Success, Failure, CatalogDb>,
): Effect.Effect<Success, Failure> => effect.pipe(Effect.provideServiceEffect(CatalogDb, catalog));
