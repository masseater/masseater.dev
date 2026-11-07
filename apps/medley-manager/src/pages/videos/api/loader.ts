import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog";
import type { VideoFilter } from "#/entities/catalog";

const loadVideosPage = ({
  queryClient,
  filter,
}: Readonly<{ queryClient: QueryClient; filter: VideoFilter }>): Promise<unknown> =>
  queryClient.query({ ...catalogQueries.videos.get.queryOptions(filter), staleTime: "static" });

export { loadVideosPage };
