import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { catalogQueries } from "#/entities/catalog/index.ts";
import type { SongDetail } from "#/entities/catalog/index.ts";

const route = getRouteApi("/songs/$id");

export const useSong = (): SongDetail => {
  const { id } = route.useParams();
  return useSuspenseQuery(catalogQueries.songs({ id }).get.queryOptions()).data;
};
