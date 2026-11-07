import { Schema } from "effect";

import { createRouter } from "#/shared/api/index.server";
import { TextSearch } from "#/shared/lib/text-search";
import { runRequest } from "#/shared/observability/index.server";

import { personRoutes } from "./person-routes.server";
import { search } from "./search.server";
import { songRoutes } from "./song-routes.server";
import { getStats } from "./stats.server";
import { videoRoutes } from "./video-routes.server";

const catalogRoutes = createRouter("/api/catalog")
  .get("/stats", () => runRequest(getStats))
  .get("/search", ({ query }) => runRequest(search(query.keyword)), {
    query: Schema.toStandardSchemaV1(TextSearch),
  })
  .use(songRoutes)
  .use(videoRoutes)
  .use(personRoutes);

type CatalogRoutes = typeof catalogRoutes;

export type { CatalogRoutes };
export { catalogRoutes };
