import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog/index.ts";
import type { TextFilter } from "#/shared/lib/text-search.ts";

export const loadSongsPage = ({
  queryClient,
  filter,
}: Readonly<{ queryClient: QueryClient; filter: TextFilter }>): Promise<unknown> =>
  queryClient.query({ ...catalogQueries.songs.get.queryOptions(filter), staleTime: "static" });
