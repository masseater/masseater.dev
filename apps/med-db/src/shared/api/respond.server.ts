import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Effect, Option, Schema, pipe } from "effect";
import { status } from "elysia";
import type { ElysiaCustomStatusResponse } from "elysia";

import { CatalogDb } from "#/shared/db/index.server.ts";
import type { CatalogRelations } from "#/shared/db/index.server.ts";
import { runRequest } from "#/shared/observability/index.server.ts";

const NOT_FOUND = 404;

export const IdParams = Schema.toStandardSchemaV1(Schema.Struct({ id: Schema.FiniteFromString }));

export type NotFound = ElysiaCustomStatusResponse<typeof NOT_FOUND, "not found">;

export type Handle = (request: Request) => Promise<Response>;

const catalogs = new WeakMap<Request, DrizzleD1Database<CatalogRelations>>();

export const servingCatalog =
  (db: DrizzleD1Database<CatalogRelations>) =>
  (handle: Handle): Handle =>
  (request) => {
    catalogs.set(request, db);
    return handle(request);
  };

const catalogFor = (request: Request): Effect.Effect<DrizzleD1Database<CatalogRelations>> =>
  pipe(catalogs.get(request), Option.fromUndefinedOr, Effect.fromOption, Effect.orDie);

export const respond =
  (request: Request) =>
  <Found>(found: Effect.Effect<Found, never, CatalogDb>): Promise<Found> =>
    runRequest(Effect.provideServiceEffect(found, CatalogDb, catalogFor(request)));

const foundOrNotFound = <Found>(found: Option.Option<Found>): Found | NotFound =>
  Option.match(found, {
    onNone: () => status(NOT_FOUND, "not found" as const),
    onSome: (row): Found | NotFound => row,
  });

export const respondFound =
  (request: Request) =>
  <Found>(
    found: Effect.Effect<Option.Option<Found>, never, CatalogDb>,
  ): Promise<Found | NotFound> =>
    respond(request)(found.pipe(Effect.map(foundOrNotFound)));
