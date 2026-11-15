import { String as Str, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { yen } from "#/entities/money";
import type { MonthTotalValue } from "#/entities/money";

const TEXT = { income: "収入", expense: "支出" } as const;

const ROUND = 4;

const FLAT = 0;

const BAR_RADIUS: [number, number, number, number] = [ROUND, ROUND, FLAT, FLAT];

const BAR_GAP = 2;

const HEIGHT = 260;

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const;

const CURSOR = { fill: "var(--muted)" } as const;

const INITIAL_DIMENSION = { width: 720, height: HEIGHT } as const;

const MAN = 10_000;

const YEAR_START = 2;

const shortYen = (amount: number): string => `${String(Math.round(amount / MAN))}万`;

const shortMonth = (month: string): string =>
  pipe(month, Str.slice(YEAR_START), Str.replace("-", "/"));

const asYen = (value: unknown): string => yen(Number(value));

const MonthlyChart = ({
  months,
  title,
}: Readonly<{ months: readonly MonthTotalValue[]; title: string }>): ReactNode => {
  const data = useMemo(() => [...months], [months]);
  return (
    <ResponsiveContainer className="text-xs" height={HEIGHT} initialDimension={INITIAL_DIMENSION}>
      <BarChart barGap={BAR_GAP} data={data} desc={title}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="month"
          tick={AXIS_TICK}
          tickFormatter={shortMonth}
          tickLine={false}
        />
        <YAxis axisLine={false} tick={AXIS_TICK} tickFormatter={shortYen} tickLine={false} />
        <Tooltip cursor={CURSOR} formatter={asYen} />
        <Legend iconType="circle" />
        <Bar dataKey="income" fill="var(--chart-income)" name={TEXT.income} radius={BAR_RADIUS} />
        <Bar
          dataKey="expense"
          fill="var(--chart-expense)"
          name={TEXT.expense}
          radius={BAR_RADIUS}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export { MonthlyChart };
