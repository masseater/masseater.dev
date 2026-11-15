import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, Option, Predicate, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { PeriodValue, SettingsValue } from "#/entities/money";
import { useTransactions } from "#/pages/money/api/money-query";
import { accountLabel, categoryLabel } from "#/pages/money/model/labels";
import { RowList } from "#/shared/ui";

import { PageLinks } from "./page-links";
import { TransactionRow } from "./transaction-row";

const route = getRouteApi("/money");

const LABEL = "取引";

const TransactionList = ({
  period,
  settings,
}: Readonly<{ period: PeriodValue; settings: SettingsValue }>): ReactNode => {
  const { cursor } = route.useSearch();
  const page = useTransactions(period);
  const labels = useMemo(
    () => ({ category: categoryLabel(settings), account: accountLabel(settings) }),
    [settings],
  );
  return (
    <div className="flex flex-col gap-4">
      <RowList label={LABEL}>
        {pipe(
          page.transactions,
          Arr.map((transaction) => (
            <TransactionRow key={transaction.id} labels={labels} transaction={transaction} />
          )),
        )}
      </RowList>
      <PageLinks
        next={Option.fromNullOr(page.next)}
        paged={Predicate.isNotUndefined(cursor)}
        period={period}
      />
    </div>
  );
};

export { TransactionList };
