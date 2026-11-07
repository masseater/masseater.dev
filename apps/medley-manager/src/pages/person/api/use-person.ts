import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { catalogQueries } from "#/entities/catalog";
import type { PersonDetail } from "#/entities/catalog";

const route = getRouteApi("/people/$id");

const usePerson = (): PersonDetail => {
  const { id } = route.useParams();
  return useSuspenseQuery(catalogQueries.people({ id }).get.queryOptions()).data;
};

export { usePerson };
