"use client";

import type { ReactNode } from "react";
import { CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

import { pointsOf } from "#/pages/leaderboard/ui/format";

import {
  AXIS_TICK,
  FULL_PERCENT,
  ORIGIN,
  PERCENT_SCALE,
  REFERENCE_COLOR,
  TOOLTIP_STYLE,
} from "./chart-style";

const X_LABEL = { value: "確信度", position: "insideBottom", offset: -4, fontSize: 12 } as const;
const Y_LABEL = {
  value: "実際の正解率",
  angle: -90,
  position: "insideLeft",
  fontSize: 12,
} as const;
const HORIZONTAL = "x";
const VERTICAL = "y";
const DIAGONAL = [
  { [HORIZONTAL]: ORIGIN, [VERTICAL]: ORIGIN },
  { [HORIZONTAL]: FULL_PERCENT, [VERTICAL]: FULL_PERCENT },
] as const;
const DASH = "4 4";
const TICK_STEP = 10;
const floorOf = (value: number): number => Math.floor(value / TICK_STEP) * TICK_STEP;

const LAST_TICK = 1;
const TOOLTIP_ITEM = { color: "var(--color-popover-foreground)" } as const;

const scaleFrom = (
  lowest: number,
): Readonly<{ domain: readonly [number, number]; ticks: readonly number[] }> => {
  const floor = floorOf(lowest);
  return {
    domain: [floor, FULL_PERCENT],
    ticks: Array.from(
      { length: (FULL_PERCENT - floor) / TICK_STEP + LAST_TICK },
      (_tick, index) => floor + index * TICK_STEP,
    ),
  };
};

const labelOf = (payload: unknown): string => {
  if (typeof payload === "object" && payload !== null && "label" in payload) {
    return String(payload.label);
  }
  return "";
};

const tooltipFormat = (
  value: unknown,
  name: unknown,
  item: Readonly<{ payload?: unknown }>,
): [string, string] => [`${pointsOf(value)}%`, `${labelOf(item.payload)} ${String(name)}`];

const ReliabilityAxes = ({ lowest }: Readonly<{ lowest: number }>): ReactNode => {
  const scale = scaleFrom(lowest);
  return (
    <>
      <CartesianGrid />
      <XAxis
        type="number"
        dataKey="confidence"
        name="確信度"
        domain={scale.domain}
        ticks={scale.ticks}
        tick={AXIS_TICK}
        label={X_LABEL}
      />
      <YAxis
        type="number"
        dataKey="accuracy"
        name="実際の正解率"
        domain={PERCENT_SCALE}
        tick={AXIS_TICK}
        label={Y_LABEL}
      />
      <ReferenceLine
        segment={DIAGONAL}
        ifOverflow="hidden"
        stroke={REFERENCE_COLOR}
        strokeDasharray={DASH}
      />
      <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM} formatter={tooltipFormat} />
    </>
  );
};

export { ReliabilityAxes };
