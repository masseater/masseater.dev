import type { ScheduleView } from "@masseater.dev/portal-protocol";
import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { schedulesQueries } from "#/entities/schedule/index.ts";

export const loadSchedulesPage = (queryClient: QueryClient): Promise<unknown> =>
  queryClient.query(schedulesQueries.get.queryOptions());

export const useSchedules = (): readonly ScheduleView[] =>
  useSuspenseQuery(schedulesQueries.get.queryOptions()).data;
