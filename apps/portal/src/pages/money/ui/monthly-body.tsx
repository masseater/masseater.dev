import type { ReactNode } from "react";

import type { MonthTotalValue } from "#/entities/money/index.ts";
import { ChartLegend } from "#/shared/ui/index.ts";
import type { LegendItem } from "#/shared/ui/index.ts";

import { MonthlyChart } from "./monthly-chart.tsx";
import { MonthlyTable } from "./monthly-table.tsx";

const LEGEND: readonly LegendItem[] = [
  { label: "収入", swatch: "bg-income size-3 rounded-xs" },
  { label: "支出", swatch: "bg-expense size-3 rounded-xs" },
  { label: "収支", swatch: "bg-balance-line h-0.5 w-4" },
];

export const MonthlyBody = ({
  months,
  title,
}: Readonly<{ months: readonly MonthTotalValue[]; title: string }>): ReactNode => (
  <>
    <ChartLegend items={LEGEND} />
    <MonthlyChart months={months} title={title} />
    <MonthlyTable months={months} />
  </>
);
