import { Schema } from "effect";

import { createRouter, respond } from "#/shared/api/index.server.ts";

import { rankPeople, rankSongs, rankVideos } from "./ranking.server.ts";

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

const LimitRange = Schema.isBetween({ minimum: MIN_LIMIT, maximum: MAX_LIMIT });

const Limit = Schema.FiniteFromString.check(Schema.isInt(), LimitRange);

const RankingSearch = Schema.toStandardSchemaV1(Schema.Struct({ limit: Limit }));

export const rankingRoutes = createRouter("/ranking")
  .get("/songs", ({ query, request }) => respond(request)(rankSongs(query.limit)), {
    query: RankingSearch,
  })
  .get("/videos", ({ query, request }) => respond(request)(rankVideos(query.limit)), {
    query: RankingSearch,
  })
  .get("/people", ({ query, request }) => respond(request)(rankPeople(query.limit)), {
    query: RankingSearch,
  });
