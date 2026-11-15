import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { watashiQueries } from "#/entities/watashi";
import type { MemoValue, MemosSearchValue } from "#/entities/watashi";
import { loadProjects } from "#/features/filter-memos";

type MemosLoad = Readonly<{ queryClient: QueryClient; search: MemosSearchValue }>;

const route = getRouteApi("/_watashi/memos/");

export const loadMemosPage = ({ queryClient, search }: MemosLoad): Promise<unknown> =>
  Promise.all([
    queryClient.query(watashiQueries.memos.get.queryOptions(search)),
    loadProjects(queryClient),
  ]);

export const useMemos = (): readonly MemoValue[] =>
  useSuspenseQuery(watashiQueries.memos.get.queryOptions(route.useSearch())).data.items;
