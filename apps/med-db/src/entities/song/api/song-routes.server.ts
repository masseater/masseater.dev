import { Schema } from "effect";

import { createRouter, IdParams, respondFound, respond } from "#/shared/api/index.server.ts";
import { keywordOf } from "#/shared/db/index.server.ts";
import { TextSearch } from "#/shared/lib/text-search.ts";

import { getSong } from "./song.server.ts";
import { listSongs } from "./songs.server.ts";

export const songRoutes = createRouter("/songs")
  .get("/", ({ query, request }) => respond(request)(keywordOf(query.keyword).pipe(listSongs)), {
    query: Schema.toStandardSchemaV1(TextSearch),
  })
  .get("/:id", ({ params, request }) => respondFound(request)(getSong(params.id)), {
    params: IdParams,
  });
