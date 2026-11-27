import { Schema } from "effect";

import { personRoutes } from "#/entities/person/@x/catalog.ts";
import { songRoutes } from "#/entities/song/@x/catalog.ts";
import { videoRoutes } from "#/entities/video/@x/catalog.ts";
import { createRouter, respond } from "#/shared/api/index.server.ts";
import { TextSearch } from "#/shared/lib/text-search.ts";

import { rankingRoutes } from "./ranking-routes.server.ts";
import { search } from "./search.server.ts";
import { getStats } from "./stats.server.ts";

export const catalogRoutes = createRouter("/api/catalog")
  .get("/stats", ({ request }) => respond(request)(getStats))
  .get("/search", ({ query, request }) => respond(request)(search(query.keyword)), {
    query: Schema.toStandardSchemaV1(TextSearch),
  })
  .use(songRoutes)
  .use(videoRoutes)
  .use(personRoutes)
  .use(rankingRoutes);

export type CatalogRoutes = typeof catalogRoutes;
