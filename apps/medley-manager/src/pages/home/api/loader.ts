import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog";
import { DANMAKU_SONGS } from "#/pages/home/lib/danmaku";
import { RANKING_LIMIT } from "#/pages/home/lib/rank";

const FEATURED_LIMIT = 8;

const statsQuery = catalogQueries.stats.get.queryOptions();

const videosQuery = catalogQueries.ranking.videos.get.queryOptions({ limit: FEATURED_LIMIT });

const songsQuery = catalogQueries.ranking.songs.get.queryOptions({
  limit: Math.max(DANMAKU_SONGS, RANKING_LIMIT),
});

const peopleQuery = catalogQueries.ranking.people.get.queryOptions({ limit: RANKING_LIMIT });

const loadHomePage = (queryClient: QueryClient): Promise<unknown> =>
  Promise.all([
    queryClient.query({ ...statsQuery, staleTime: "static" }),
    queryClient.query({ ...videosQuery, staleTime: "static" }),
    queryClient.query({ ...songsQuery, staleTime: "static" }),
    queryClient.query({ ...peopleQuery, staleTime: "static" }),
  ]);

export { loadHomePage, peopleQuery, songsQuery, statsQuery, videosQuery };
