import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { catalogQueries } from "#/entities/catalog/index.ts";
import type { PersonDetail } from "#/entities/catalog/index.ts";

const route = getRouteApi("/people/$id");

export const usePerson = (): PersonDetail => {
  const { id } = route.useParams();
  return useSuspenseQuery(catalogQueries.people({ id }).get.queryOptions()).data;
};
