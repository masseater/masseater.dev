import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog";
import type { TextFilter } from "#/shared/lib/text-search";

const loadSongsPage = ({
  queryClient,
  filter,
}: Readonly<{ queryClient: QueryClient; filter: TextFilter }>): Promise<unknown> =>
  queryClient.query({ ...catalogQueries.songs.get.queryOptions(filter), staleTime: "static" });

export { loadSongsPage };
