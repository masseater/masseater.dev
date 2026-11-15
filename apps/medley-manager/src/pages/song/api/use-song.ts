import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { catalogQueries } from "#/entities/catalog";
import type { SongDetail } from "#/entities/catalog";

const route = getRouteApi("/songs/$id");

export const useSong = (): SongDetail => {
  const { id } = route.useParams();
  return useSuspenseQuery(catalogQueries.songs({ id }).get.queryOptions()).data;
};
