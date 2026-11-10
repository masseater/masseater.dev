import { Schema } from "effect";

import { createRouter } from "#/shared/api/index.server";
import { runRequest } from "#/shared/observability/index.server";

import { rankPeople, rankSongs, rankVideos } from "./ranking.server";

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

const LimitRange = Schema.isBetween({ minimum: MIN_LIMIT, maximum: MAX_LIMIT });

const Limit = Schema.FiniteFromString.check(Schema.isInt(), LimitRange);

const RankingSearch = Schema.toStandardSchemaV1(Schema.Struct({ limit: Limit }));

const rankingRoutes = createRouter("/ranking")
  .get("/songs", ({ query }) => runRequest(rankSongs(query.limit)), { query: RankingSearch })
  .get("/videos", ({ query }) => runRequest(rankVideos(query.limit)), { query: RankingSearch })
  .get("/people", ({ query }) => runRequest(rankPeople(query.limit)), { query: RankingSearch });

export { rankingRoutes };
