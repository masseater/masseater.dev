import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { catalogQueries } from "#/entities/catalog";
import type { VideoDetail } from "#/entities/catalog";

const route = getRouteApi("/videos/$id");

const useVideo = (): VideoDetail => {
  const { id } = route.useParams();
  return useSuspenseQuery(catalogQueries.videos({ id }).get.queryOptions()).data;
};

export { useVideo };
