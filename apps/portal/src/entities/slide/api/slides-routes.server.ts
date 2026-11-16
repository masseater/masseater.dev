import { Schema } from "effect";

import { Decks, Hits, SearchQuery } from "#/entities/slide/model/slides.ts";
import {
  createRouter,
  jsonBody,
  personal,
  respond,
  rpcBody,
  slides,
} from "#/shared/api/index.server.ts";

const HIT_LIMIT = 20;

export const slidesRoutes = createRouter("/api/slides")
  .get("/decks", () =>
    respond(jsonBody({ schema: Decks, call: () => personal("/decks/decks.json") })),
  )
  .get(
    "/search",
    ({ query }) =>
      respond(rpcBody({ schema: Hits, call: () => slides().search(query.keyword, HIT_LIMIT) })),
    { query: Schema.toStandardSchemaV1(SearchQuery) },
  );

export type SlidesRoutes = typeof slidesRoutes;
