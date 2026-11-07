import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog";
import type { TextFilter } from "#/shared/lib/text-search";

const loadSearchPage = ({
  queryClient,
  filter,
}: Readonly<{ queryClient: QueryClient; filter: TextFilter }>): Promise<unknown> =>
  queryClient.query({ ...catalogQueries.search.get.queryOptions(filter), staleTime: "static" });

export { loadSearchPage };
