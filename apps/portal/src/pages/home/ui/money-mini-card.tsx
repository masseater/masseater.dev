import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Card, CardHeader, ChartLegend } from "#/shared/ui/index.ts";
import type { LegendItem } from "#/shared/ui/index.ts";

import { MoneyMiniChart } from "./money-mini-chart.tsx";

const TEXT = { title: "お金", meta: "直近 6 か月", more: "お金を開く" } as const;

const LEGEND: readonly LegendItem[] = [
  { label: "収入", swatch: "bg-income size-3 rounded-xs" },
  { label: "支出", swatch: "bg-expense size-3 rounded-xs" },
];

export const MoneyMiniCard = (): ReactNode => (
  <Card>
    <CardHeader meta={TEXT.meta} title={TEXT.title}>
      <Link className="text-link text-sm underline underline-offset-3" to="/money">
        {TEXT.more}
      </Link>
    </CardHeader>
    <ChartLegend items={LEGEND} />
    <MoneyMiniChart />
  </Card>
);
