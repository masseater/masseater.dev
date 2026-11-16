import type { ReactNode } from "react";

import { YEN } from "#/entities/money/index.ts";
import type { Placement } from "#/pages/money/model/flow.ts";

const AMOUNT_LINE = 16;

const HALO = 4;

const HALF = 2;

export const FlowNodeLabel = ({
  amount,
  label,
  placement,
  x,
  y,
}: Readonly<{
  amount: number;
  label: string;
  placement: Placement;
  x: number;
  y: number;
}>): ReactNode => (
  <text
    dominantBaseline="middle"
    paintOrder="stroke"
    stroke="var(--card)"
    strokeLinejoin="round"
    strokeWidth={HALO}
    textAnchor={placement.anchor}
    x={x}
    y={y}
  >
    <tspan className="fill-foreground text-xs font-bold" dy={-AMOUNT_LINE / HALF} x={x}>
      {label}
    </tspan>
    <tspan className="fill-muted-foreground text-xs tabular-nums" dy={AMOUNT_LINE} x={x}>
      {YEN.format(amount)}
    </tspan>
  </text>
);
