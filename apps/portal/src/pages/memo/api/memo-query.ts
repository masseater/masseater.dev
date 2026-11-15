import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { watashiQueries } from "#/entities/watashi";
import type { MemoValue, RevisionValue } from "#/entities/watashi";

type MemoKey = Readonly<{ project: string; name: string }>;

type MemoLoad = Readonly<{ queryClient: QueryClient; key: MemoKey }>;

type MemoDetail = Readonly<{ memo: readonly MemoValue[]; revisions: readonly RevisionValue[] }>;

const route = getRouteApi("/_watashi/memos/$project/$name");

export const loadMemoPage = ({ queryClient, key }: MemoLoad): Promise<unknown> =>
  queryClient.query(
    watashiQueries.memos({ project: key.project })({ name: key.name }).get.queryOptions(),
  );

export const useMemoDetail = (): MemoDetail => {
  const { project, name } = route.useParams();
  return useSuspenseQuery(watashiQueries.memos({ project })({ name }).get.queryOptions()).data;
};
