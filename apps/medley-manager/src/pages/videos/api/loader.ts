import type { QueryClient } from "@tanstack/react-query";

import { catalogQueries } from "#/entities/catalog/index.ts";
import type { VideoFilter } from "#/entities/video/index.ts";

export const loadVideosPage = ({
  queryClient,
  filter,
}: Readonly<{ queryClient: QueryClient; filter: VideoFilter }>): Promise<unknown> =>
  queryClient.query({ ...catalogQueries.videos.get.queryOptions(filter), staleTime: "static" });
