import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, Option } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { PeriodValue, SettingsValue } from "#/entities/money";
import { useTransactions } from "#/pages/money/api/money-query";
import { accountLabel, categoryLabel } from "#/pages/money/model/labels";
import { Section } from "#/shared/ui";

import { TransactionFilters } from "./transaction-filters";
import { TransactionPager } from "./transaction-pager";
import { TransactionTable } from "./transaction-table";

const route = getRouteApi("/money");

const TEXT = { title: "すべての出入金", empty: "条件に合う取引はありません" } as const;

export const TransactionsCard = ({
  period,
  settings,
}: Readonly<{ period: PeriodValue; settings: SettingsValue }>): ReactNode => {
  const search = route.useSearch();
  const page = useTransactions(period);
  const labels = useMemo(
    () => ({ category: categoryLabel(settings), account: accountLabel(settings) }),
    [settings],
  );
  return (
    <Section title={TEXT.title}>
      <TransactionFilters period={period} search={search} settings={settings} />
      {Arr.isReadonlyArrayEmpty(page.transactions) && (
        <p className="text-muted-foreground text-sm">{TEXT.empty}</p>
      )}
      {Arr.isReadonlyArrayNonEmpty(page.transactions) && (
        <TransactionTable labels={labels} transactions={page.transactions} />
      )}
      <TransactionPager next={Option.fromNullOr(page.next)} />
    </Section>
  );
};
