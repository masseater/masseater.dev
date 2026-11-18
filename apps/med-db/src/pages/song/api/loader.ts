import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog/index.ts";

export const loadSongPage = ({
  queryClient,
  id,
}: Readonly<{ queryClient: QueryClient; id: number }>): Promise<unknown> =>
  queryClient.query({ ...catalogQueries.songs({ id }).get.queryOptions(), staleTime: "static" });
