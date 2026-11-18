import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog/index.ts";
import type { TextFilter } from "#/shared/lib/text-search.ts";

export const loadSearchPage = ({
  queryClient,
  filter,
}: Readonly<{ queryClient: QueryClient; filter: TextFilter }>): Promise<unknown> =>
  queryClient.query({ ...catalogQueries.search.get.queryOptions(filter), staleTime: "static" });
