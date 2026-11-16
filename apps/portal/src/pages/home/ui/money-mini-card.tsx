import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { hasMovement } from "#/entities/money/index.ts";
import { useOverview } from "#/pages/home/api/home-query.ts";
import { RECENT_MONTHS } from "#/pages/home/model/recent-months.ts";
import { Card, CardHeader, ChartLegend } from "#/shared/ui/index.ts";
import type { LegendItem } from "#/shared/ui/index.ts";

import { MoneyMiniChart } from "./money-mini-chart.tsx";

const TEXT = {
  title: "お金",
  meta: "直近 6 か月",
  more: "お金を開く",
  empty: "直近 6 か月の取引はありません",
} as const;

const LEGEND: readonly LegendItem[] = [
  { label: "収入", swatch: "bg-income size-3 rounded-xs" },
  { label: "支出", swatch: "bg-expense size-3 rounded-xs" },
];

export const MoneyMiniCard = (): ReactNode => {
  const moving = pipe(useOverview().months, Arr.takeRight(RECENT_MONTHS), hasMovement);
  return (
    <Card>
      <CardHeader meta={TEXT.meta} title={TEXT.title}>
        <Link className="text-link text-sm underline underline-offset-3" to="/money">
          {TEXT.more}
        </Link>
      </CardHeader>
      {!moving && <p className="text-muted-foreground text-sm">{TEXT.empty}</p>}
      {moving && <ChartLegend items={LEGEND} />}
      {moving && <MoneyMiniChart />}
    </Card>
  );
};
