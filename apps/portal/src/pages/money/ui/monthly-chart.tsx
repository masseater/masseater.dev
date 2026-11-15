import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { monthLabel, signedYen, yen } from "#/entities/money";
import type { MonthTotalValue } from "#/entities/money";
import { monthlyRows } from "#/pages/money/model/monthly-rows";

const TEXT = { income: "収入", expense: "支出", balance: "収支" } as const;

const HEIGHT = 320;

const INITIAL_DIMENSION = { width: 720, height: HEIGHT } as const;

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const;

const CURSOR = { fill: "var(--muted)" } as const;

const STACK = "flow";

const MAN = 10_000;

const BAR_SIZE = 20;

const LINE_WIDTH = 2;

const shortYen = (amount: number): string => `${String(Math.round(amount / MAN))}万`;

const asYen = (value: unknown, name: unknown): string => {
  if (name === TEXT.balance) {
    return signedYen(Number(value));
  }
  return yen(Math.abs(Number(value)));
};

export const MonthlyChart = ({
  months,
  title,
}: Readonly<{ months: readonly MonthTotalValue[]; title: string }>): ReactNode => {
  const data = useMemo(() => monthlyRows(months), [months]);
  return (
    <ResponsiveContainer height={HEIGHT} initialDimension={INITIAL_DIMENSION}>
      <ComposedChart data={data} desc={title} stackOffset="sign">
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="month"
          tick={AXIS_TICK}
          tickFormatter={monthLabel}
          tickLine={false}
        />
        <YAxis axisLine={false} tick={AXIS_TICK} tickFormatter={shortYen} tickLine={false} />
        <ReferenceLine stroke="var(--line-strong)" y={0} />
        <Tooltip cursor={CURSOR} formatter={asYen} labelFormatter={monthLabel} />
        <Bar
          barSize={BAR_SIZE}
          dataKey="income"
          fill="var(--income)"
          name={TEXT.income}
          stackId={STACK}
        />
        <Bar
          barSize={BAR_SIZE}
          dataKey="expense"
          fill="var(--expense)"
          name={TEXT.expense}
          stackId={STACK}
        />
        <Line
          dataKey="balance"
          name={TEXT.balance}
          stroke="var(--balance-line)"
          strokeWidth={LINE_WIDTH}
          type="monotone"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
