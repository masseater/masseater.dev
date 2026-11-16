import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { catalogQueries } from "#/entities/catalog/index.ts";
import type { VideoDetail } from "#/entities/catalog/index.ts";

const route = getRouteApi("/videos/$id");

export const useVideo = (): VideoDetail => {
  const { id } = route.useParams();
  return useSuspenseQuery(catalogQueries.videos({ id }).get.queryOptions()).data;
};
