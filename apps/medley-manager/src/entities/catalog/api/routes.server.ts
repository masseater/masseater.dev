import { Schema } from "effect";

import { personRoutes } from "#/entities/person/@x/catalog";
import { songRoutes } from "#/entities/song/@x/catalog";
import { videoRoutes } from "#/entities/video/@x/catalog";
import { createRouter } from "#/shared/api/index.server";
import { TextSearch } from "#/shared/lib/text-search";
import { runRequest } from "#/shared/observability/index.server";

import { rankingRoutes } from "./ranking-routes.server";
import { search } from "./search.server";
import { getStats } from "./stats.server";

export const catalogRoutes = createRouter("/api/catalog")
  .get("/stats", () => runRequest(getStats))
  .get("/search", ({ query }) => runRequest(search(query.keyword)), {
    query: Schema.toStandardSchemaV1(TextSearch),
  })
  .use(songRoutes)
  .use(videoRoutes)
  .use(personRoutes)
  .use(rankingRoutes);

export type CatalogRoutes = typeof catalogRoutes;
