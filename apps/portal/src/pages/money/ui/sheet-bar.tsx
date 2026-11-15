import { useMemo } from "react";
import type { ReactNode } from "react";
import { Bar, LabelList } from "recharts";

import type { SheetSeries } from "#/pages/money/model/sheet-chart.ts";

import { SheetLabel } from "./sheet-label";

const STACK = "sheet";

const DASH = "6 4";

const STROKE_WIDTH = 2;

export const SheetBar = ({ series }: Readonly<{ series: SheetSeries }>): ReactNode => {
  const label = useMemo(() => <SheetLabel title={series.label} />, [series.label]);
  return (
    <Bar
      dataKey={series.tone}
      fill={series.fill}
      isAnimationActive={false}
      name={series.label}
      stackId={STACK}
      stroke={series.stroke}
      strokeDasharray={DASH}
      strokeWidth={STROKE_WIDTH}
    >
      <LabelList content={label} dataKey={series.tone} />
    </Bar>
  );
};
