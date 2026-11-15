import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { watashiQueries } from "#/entities/watashi";
import type { MemoValue, MemosSearchValue, ProjectValue } from "#/entities/watashi";

type MemosLoad = Readonly<{ queryClient: QueryClient; search: MemosSearchValue }>;

const route = getRouteApi("/memos/");

const projects = watashiQueries["memo-projects"].get;

export const loadMemosPage = ({ queryClient, search }: MemosLoad): Promise<unknown> =>
  Promise.all([
    queryClient.query(watashiQueries.memos.get.queryOptions(search)),
    queryClient.query(projects.queryOptions()),
  ]);

export const useMemos = (): readonly MemoValue[] =>
  useSuspenseQuery(watashiQueries.memos.get.queryOptions(route.useSearch())).data.items;

export const useProjects = (): readonly ProjectValue[] =>
  useSuspenseQuery(projects.queryOptions()).data.projects;
