import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { watashiQueries } from "#/entities/watashi/index.ts";
import type { MemoValue, MemosSearchValue } from "#/entities/watashi/index.ts";
import { loadProjects } from "#/features/filter-memos/index.ts";

type MemosLoad = Readonly<{ queryClient: QueryClient; search: MemosSearchValue }>;

const route = getRouteApi("/memos/");

export const loadMemosPage = ({ queryClient, search }: MemosLoad): Promise<unknown> =>
  Promise.all([
    queryClient.query(watashiQueries.memos.get.queryOptions(search)),
    loadProjects(queryClient),
  ]);

export const useMemos = (): readonly MemoValue[] =>
  useSuspenseQuery(watashiQueries.memos.get.queryOptions(route.useSearch())).data.items;
