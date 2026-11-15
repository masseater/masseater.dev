import type { ReactNode } from "react";

import type { MonthTotalValue } from "#/entities/money";
import { ChartLegend, Section } from "#/shared/ui";
import type { LegendItem } from "#/shared/ui";

import { MonthlyChart } from "./monthly-chart";
import { MonthlyTable } from "./monthly-table";

const TITLE = "毎月の収支推移";

const LEGEND: readonly LegendItem[] = [
  { label: "収入", swatch: "bg-income size-3 rounded-xs" },
  { label: "支出", swatch: "bg-expense size-3 rounded-xs" },
  { label: "収支", swatch: "bg-balance-line h-0.5 w-4" },
];

export const MonthlyCard = ({
  months,
}: Readonly<{ months: readonly MonthTotalValue[] }>): ReactNode => (
  <Section title={TITLE}>
    <ChartLegend items={LEGEND} />
    <MonthlyChart months={months} title={TITLE} />
    <MonthlyTable months={months} />
  </Section>
);
