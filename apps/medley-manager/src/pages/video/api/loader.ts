import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog";

export const loadVideoPage = ({
  queryClient,
  id,
}: Readonly<{ queryClient: QueryClient; id: number }>): Promise<unknown> =>
  queryClient.query({ ...catalogQueries.videos({ id }).get.queryOptions(), staleTime: "static" });
