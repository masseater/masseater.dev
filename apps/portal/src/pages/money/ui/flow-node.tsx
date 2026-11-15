import { Array as Arr, Number as Num, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { yen } from "#/entities/money";
import type { FlowNodeValue } from "#/entities/money";
import { FILLS, PLACEMENTS } from "#/pages/money/model/flow";
import type { Placement } from "#/pages/money/model/flow";

type FlowNodeProps = Readonly<{
  nodes: readonly FlowNodeValue[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: Readonly<{ value?: unknown }>;
}>;

type Box = Readonly<{ x: number; width: number }>;

const LABEL_GAP = 8;

const AMOUNT_GAP = 6;

const HALO = 3;

const RADIUS = 2;

const NONE = 0;

const HALF = 2;

const LABEL_X: Readonly<Record<Placement["side"], (box: Box) => number>> = {
  left: (box) => box.x + box.width + LABEL_GAP,
  right: (box) => box.x - LABEL_GAP,
};

const amountOf = (payload: FlowNodeProps["payload"]): number =>
  pipe(
    Option.fromUndefinedOr(payload),
    Option.flatMap((node) => Num.parse(String(node.value))),
    Option.getOrElse(() => NONE),
  );

export const FlowNode = ({
  nodes,
  x = NONE,
  y = NONE,
  width = NONE,
  height = NONE,
  index = NONE,
  payload,
}: FlowNodeProps): ReactNode =>
  pipe(
    Arr.get(nodes, index),
    Option.match({
      onNone: () => false,
      onSome: (node) => (
        <g>
          <rect fill={FILLS[node.nodeType]} height={height} rx={RADIUS} width={width} x={x} y={y} />
          <text
            className="fill-foreground text-xs"
            dominantBaseline="middle"
            paintOrder="stroke"
            stroke="var(--background)"
            strokeWidth={HALO}
            textAnchor={PLACEMENTS[node.nodeType].anchor}
            x={LABEL_X[PLACEMENTS[node.nodeType].side]({ x, width })}
            y={y + height / HALF}
          >
            {node.label}
            <tspan className="fill-foreground/60 tabular-nums" dx={AMOUNT_GAP}>
              {yen(amountOf(payload))}
            </tspan>
          </text>
        </g>
      ),
    }),
  );
