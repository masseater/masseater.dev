import type { ReactNode } from "react";

import { PeriodForm } from "#/features/choose-period/index.ts";
import { useOverview } from "#/pages/money/api/money-query.ts";

import { FlowCard } from "./flow-card.tsx";
import { MoneyCharts } from "./money-charts.tsx";
import { MoneyStats } from "./money-stats.tsx";
import { TransactionsCard } from "./transactions-card.tsx";

export const MoneyPage = (): ReactNode => {
  const overview = useOverview();
  return (
    <>
      <PeriodForm
        asOf={overview.asOf}
        key={`${overview.period.from}${overview.period.to}`}
        period={overview.period}
      />
      <MoneyStats flow={overview.flow} sheet={overview.sheet} />
      <FlowCard asOf={overview.asOf} flow={overview.flow} />
      <MoneyCharts overview={overview} />
      <TransactionsCard period={overview.period} settings={overview.settings} />
    </>
  );
};
