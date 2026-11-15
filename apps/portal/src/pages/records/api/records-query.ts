import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { watashiQueries } from "#/entities/watashi";
import type { LifeItemValue, RecordsSearchValue } from "#/entities/watashi";

type RecordsLoad = Readonly<{ queryClient: QueryClient; search: RecordsSearchValue }>;

const route = getRouteApi("/_watashi/records");

const loadRecordsPage = ({ queryClient, search }: RecordsLoad): Promise<unknown> =>
  queryClient.query(watashiQueries.records.get.queryOptions(search));

const useRecords = (): readonly LifeItemValue[] =>
  useSuspenseQuery(watashiQueries.records.get.queryOptions(route.useSearch())).data.items;

export { loadRecordsPage, useRecords };
