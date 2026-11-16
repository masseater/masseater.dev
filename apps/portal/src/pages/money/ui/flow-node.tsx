import { Array as Arr, Number as Num, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { FlowNodeValue } from "#/entities/money/index.ts";
import { FILLS, PLACEMENTS, TEXT_FILLS, shareOf, toneOf } from "#/pages/money/model/flow.ts";
import type { Placement } from "#/pages/money/model/flow.ts";

import { FlowNodeLabel } from "./flow-node-label.tsx";

type FlowNodeProps = Readonly<{
  nodes: readonly FlowNodeValue[];
  whole: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: Readonly<{ value?: unknown }>;
}>;

type Box = Readonly<{ x: number; width: number }>;

const LABEL_GAP = 8;

const SHARE_GAP = 6;

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
  whole,
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
      onSome: (node) => {
        const tone = toneOf(node);
        const amount = amountOf(payload);
        const placement = PLACEMENTS[node.nodeType];
        const middle = y + height / HALF;
        return (
          <g>
            <rect fill={FILLS[tone]} height={height} width={width} x={x} y={y} />
            <text
              className="text-xs font-bold tabular-nums"
              fill={TEXT_FILLS[tone]}
              textAnchor="middle"
              x={x + width / HALF}
              y={y - SHARE_GAP}
            >
              {shareOf({ value: amount, whole })}
            </text>
            <FlowNodeLabel
              amount={amount}
              label={node.label}
              placement={placement}
              x={LABEL_X[placement.side]({ x, width })}
              y={middle}
            />
          </g>
        );
      },
    }),
  );
