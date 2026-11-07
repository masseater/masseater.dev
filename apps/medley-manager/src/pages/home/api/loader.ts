import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog";

const ALL = {};

const statsQuery = catalogQueries.stats.get.queryOptions();

const videosQuery = catalogQueries.videos.get.queryOptions(ALL);

const songsQuery = catalogQueries.songs.get.queryOptions(ALL);

const peopleQuery = catalogQueries.people.get.queryOptions(ALL);

const loadHomePage = (queryClient: QueryClient): Promise<unknown> =>
  Promise.all([
    queryClient.query({ ...statsQuery, staleTime: "static" }),
    queryClient.query({ ...videosQuery, staleTime: "static" }),
    queryClient.query({ ...songsQuery, staleTime: "static" }),
    queryClient.query({ ...peopleQuery, staleTime: "static" }),
  ]);

export { loadHomePage, peopleQuery, songsQuery, statsQuery, videosQuery };
