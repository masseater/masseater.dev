import type { ReactNode } from "react";

import { PeriodForm } from "#/features/choose-period";
import { useOverview } from "#/pages/money/api/money-query";
import { Section } from "#/shared/ui";

import { BalanceSheet } from "./balance-sheet";
import { FlowSection } from "./flow-section";
import { MonthlyChart } from "./monthly-chart";
import { MonthlyTable } from "./monthly-table";
import { Totals } from "./totals";
import { TransactionList } from "./transaction-list";

const TEXT = {
  monthly: "月ごとの収入と支出",
  sheet: "貸借対照表",
  transactions: "取引",
} as const;

export const MoneyPage = (): ReactNode => {
  const overview = useOverview();
  return (
    <div className="flex flex-col gap-12">
      <PeriodForm key={`${overview.period.from}${overview.period.to}`} period={overview.period} />
      <Totals flow={overview.flow} />
      <FlowSection flow={overview.flow} />
      <Section title={TEXT.monthly}>
        <MonthlyChart months={overview.months} title={TEXT.monthly} />
        <MonthlyTable months={overview.months} />
      </Section>
      <Section title={`${TEXT.sheet} ${overview.asOf}`}>
        <BalanceSheet sheet={overview.sheet} />
      </Section>
      <Section title={TEXT.transactions}>
        <TransactionList period={overview.period} settings={overview.settings} />
      </Section>
    </div>
  );
};
