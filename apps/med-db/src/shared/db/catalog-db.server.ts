import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Context, Effect, Option, String as Str } from "effect";

import { catalogRelations } from "./relations.ts";

export type CatalogRelations = typeof catalogRelations;

export type CatalogStatements = (
  db: DrizzleD1Database<CatalogRelations>,
) => readonly BatchItem<"sqlite">[];

export class CatalogDb extends Context.Service<CatalogDb, DrizzleD1Database<CatalogRelations>>()(
  "med-db/shared/db/catalog-db.server/CatalogDb",
) {}

export const catalogDbOf = (binding: D1Database): DrizzleD1Database<CatalogRelations> =>
  drizzle(binding, { relations: catalogRelations });

export const fromCatalog = Effect.fn("catalog.read")(function* fromCatalog<Found>(
  read: (db: DrizzleD1Database<CatalogRelations>) => Promise<Found>,
) {
  const db = yield* CatalogDb;
  return yield* Effect.promise(() => read(db));
});

export const NO_ROWS = 0;

export const keywordOf = (raw: string | undefined): Option.Option<string> =>
  Option.fromUndefinedOr(raw).pipe(
    Option.map((value) => Str.trim(value)),
    Option.filter((value) => value.length > NO_ROWS),
  );
