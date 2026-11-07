import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { catalogQueries } from "#/entities/catalog";
import type { SearchResults } from "#/entities/catalog";

const route = getRouteApi("/search");

const useSearchResults = (): SearchResults => {
  const filter = route.useSearch();
  return useSuspenseQuery(catalogQueries.search.get.queryOptions(filter)).data;
};

export { useSearchResults };
