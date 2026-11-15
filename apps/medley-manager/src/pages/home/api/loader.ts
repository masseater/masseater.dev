import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog";
import { DANMAKU_SONGS } from "#/pages/home/lib/danmaku";
import { RANKING_LIMIT } from "#/pages/home/lib/rank";

const FEATURED_LIMIT = 8;

export const statsQuery = catalogQueries.stats.get.queryOptions();

export const videosQuery = catalogQueries.ranking.videos.get.queryOptions({
  limit: FEATURED_LIMIT,
});

export const songsQuery = catalogQueries.ranking.songs.get.queryOptions({
  limit: Math.max(DANMAKU_SONGS, RANKING_LIMIT),
});

export const peopleQuery = catalogQueries.ranking.people.get.queryOptions({ limit: RANKING_LIMIT });

export const loadHomePage = (queryClient: QueryClient): Promise<unknown> =>
  Promise.all([
    queryClient.query({ ...statsQuery, staleTime: "static" }),
    queryClient.query({ ...videosQuery, staleTime: "static" }),
    queryClient.query({ ...songsQuery, staleTime: "static" }),
    queryClient.query({ ...peopleQuery, staleTime: "static" }),
  ]);
