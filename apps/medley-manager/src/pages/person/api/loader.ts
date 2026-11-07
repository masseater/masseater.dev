import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog";

const loadPersonPage = ({
  queryClient,
  id,
}: Readonly<{ queryClient: QueryClient; id: number }>): Promise<unknown> =>
  queryClient.query({ ...catalogQueries.people({ id }).get.queryOptions(), staleTime: "static" });

export { loadPersonPage };
