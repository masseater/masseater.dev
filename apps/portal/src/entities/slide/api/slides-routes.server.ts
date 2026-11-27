import { Schema } from "effect";

import { Decks, Hits, SearchQuery } from "#/entities/slide/model/slides.ts";
import { createRouter, jsonBody, personal, respond, rpcBody } from "#/shared/api/index.server.ts";

const HIT_LIMIT = 20;

export const slidesRoutes = createRouter("/api/slides")
  .get("/decks", ({ request }) =>
    respond(request)(jsonBody({ schema: Decks, call: personal("/decks/decks.json") })),
  )
  .get(
    "/search",
    ({ query, request }) =>
      respond(request)(
        rpcBody({ schema: Hits, call: ({ SLIDES }) => SLIDES.search(query.keyword, HIT_LIMIT) }),
      ),
    { query: Schema.toStandardSchemaV1(SearchQuery) },
  );

export type SlidesRoutes = typeof slidesRoutes;
