import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { catalogQueries } from "#/entities/catalog/index.ts";
import type { SearchResults } from "#/entities/catalog/index.ts";

const route = getRouteApi("/search");

export const useSearchResults = (): SearchResults => {
  const filter = route.useSearch();
  return useSuspenseQuery(catalogQueries.search.get.queryOptions(filter)).data;
};
