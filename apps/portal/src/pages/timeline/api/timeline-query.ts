import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { watashiQueries } from "#/entities/watashi";
import type { TimelineEntry } from "#/entities/watashi";

export const loadTimelinePage = (queryClient: QueryClient): Promise<unknown> =>
  queryClient.query(watashiQueries.timeline.get.queryOptions());

export const useTimeline = (): readonly TimelineEntry[] =>
  useSuspenseQuery(watashiQueries.timeline.get.queryOptions()).data;
