import type { ReactNode } from "react";
import { ErrorBar } from "recharts";

import { ERROR_WIDTH, REFERENCE_COLOR } from "./chart-style.ts";

export const intervalBar = (direction: "x" | "y"): ReactNode => (
  <ErrorBar
    isAnimationActive={false}
    dataKey="error"
    direction={direction}
    width={ERROR_WIDTH}
    stroke={REFERENCE_COLOR}
  />
);

export const errorOf = ({
  value,
  lower,
  upper,
}: Readonly<{ value: number; lower: number; upper: number }>): readonly [number, number] => [
  value - lower,
  upper - value,
];
