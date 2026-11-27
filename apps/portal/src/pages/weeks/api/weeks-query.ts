import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { watashiQueries } from "#/entities/watashi/index.ts";
import type { MemoValue } from "#/entities/watashi/index.ts";

export const loadWeeksPage = (queryClient: QueryClient): Promise<unknown> =>
  queryClient.query(watashiQueries.weeks.get.queryOptions());

export const useWeekMemos = (): readonly MemoValue[] =>
  useSuspenseQuery(watashiQueries.weeks.get.queryOptions()).data.items;
