import { Schema } from "effect";

import { createRouter } from "#/shared/api/index.server";
import { TextSearch } from "#/shared/lib/text-search";
import { runRequest } from "#/shared/observability/index.server";

import { keywordOf } from "./db.server";
import { IdParams, respondFound } from "./respond.server";
import { getSong } from "./song.server";
import { listSongs } from "./songs.server";

const songRoutes = createRouter("/songs")
  .get("/", ({ query }) => runRequest(keywordOf(query.keyword).pipe(listSongs)), {
    query: Schema.toStandardSchemaV1(TextSearch),
  })
  .get("/:id", ({ params }) => respondFound(getSong(params.id)), { params: IdParams });

export { songRoutes };
