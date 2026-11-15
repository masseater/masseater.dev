import { Array as Arr, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { monthLabel, YEN } from "#/entities/money";
import { useOverview } from "#/pages/home/api/home-query";
import { RECENT_MONTHS } from "#/pages/home/model/recent-months";

const TEXT = { income: "収入", expense: "支出" } as const;

const HEIGHT = 160;

const INITIAL = { width: 320, height: HEIGHT } as const;

const STACK = "money";

const TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;

const asYen = (value: unknown): string => YEN.format(Math.abs(Number(value)));

export const MoneyMiniChart = (): ReactNode => {
  const { months } = useOverview();
  const data = useMemo(
    () =>
      pipe(
        months,
        Arr.takeRight(RECENT_MONTHS),
        Arr.map((row) => ({ month: row.month, income: row.income, expense: -row.expense })),
      ),
    [months],
  );
  return (
    <ResponsiveContainer height={HEIGHT} initialDimension={INITIAL}>
      <BarChart data={data} stackOffset="sign">
        <XAxis
          axisLine={false}
          dataKey="month"
          tick={TICK}
          tickFormatter={monthLabel}
          tickLine={false}
        />
        <ReferenceLine stroke="var(--line-strong)" y={0} />
        <Tooltip formatter={asYen} labelFormatter={monthLabel} />
        <Bar dataKey="income" fill="var(--income)" name={TEXT.income} stackId={STACK} />
        <Bar dataKey="expense" fill="var(--expense)" name={TEXT.expense} stackId={STACK} />
      </BarChart>
    </ResponsiveContainer>
  );
};
