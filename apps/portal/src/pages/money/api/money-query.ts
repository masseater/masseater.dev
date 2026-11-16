import { run } from "@r_masseater/workers-tracing/effect";
import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Effect, Option, Record as Rec, String as Str } from "effect";

import { moneyQueries } from "#/entities/money/index.ts";
import type {
  MoneySearchValue,
  OverviewValue,
  PeriodValue,
  TransactionPageValue,
} from "#/entities/money/index.ts";

type MoneyLoad = Readonly<{ queryClient: QueryClient; search: MoneySearchValue }>;

type PageKey = Readonly<{ period: PeriodValue; search: MoneySearchValue }>;

const route = getRouteApi("/money");

const periodQuery = ({ from, to }: MoneySearchValue): Readonly<Record<string, string>> =>
  Rec.getSomes({ from: Option.fromUndefinedOr(from), to: Option.fromUndefinedOr(to) });

const pageQuery = ({
  period,
  search,
}: PageKey): Readonly<{
  from: string;
  to: string;
  cursor?: string;
  account?: string;
  category?: string;
}> => ({
  from: period.from,
  to: period.to,
  ...Rec.getSomes({
    cursor: Option.fromUndefinedOr(search.cursor),
    account: Option.filter(Option.fromUndefinedOr(search.account), Str.isNonEmpty),
    category: Option.filter(Option.fromUndefinedOr(search.category), Str.isNonEmpty),
  }),
});

export const loadMoneyPage = ({ queryClient, search }: MoneyLoad): Promise<unknown> =>
  run(
    Effect.promise(() =>
      queryClient.query(moneyQueries.overview.get.queryOptions(periodQuery(search))),
    ).pipe(
      Effect.flatMap(({ period }) =>
        Effect.promise(() =>
          queryClient.query(
            moneyQueries.transactions.get.queryOptions(pageQuery({ period, search })),
          ),
        ),
      ),
    ),
  );

export const useOverview = (): OverviewValue => {
  const input = periodQuery(route.useSearch());
  return useSuspenseQuery(moneyQueries.overview.get.queryOptions(input)).data;
};

export const useTransactions = (period: PeriodValue): TransactionPageValue => {
  const search = route.useSearch();
  return useSuspenseQuery(moneyQueries.transactions.get.queryOptions(pageQuery({ period, search })))
    .data;
};
