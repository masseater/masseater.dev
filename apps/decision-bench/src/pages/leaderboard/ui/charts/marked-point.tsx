import { Schema } from "effect";
import type { ReactElement } from "react";

import { ORIGIN, REFERENCE_COLOR } from "./chart-style";

const RADIUS = 5;
const FONT_SIZE = 11;
const LEADER_RATIO = 0.6;

const MarkSchema = Schema.Struct({
  mark: Schema.String,
  color: Schema.String,
  spot: Schema.Struct({
    dx: Schema.Finite,
    dy: Schema.Finite,
    ring: Schema.Literals(["near", "far"]),
  }),
});

const isMarked = Schema.is(MarkSchema);

const MarkedPoint = ({
  cx = ORIGIN,
  cy = ORIGIN,
  fill,
  payload,
}: Readonly<{
  cx: number | undefined;
  cy: number | undefined;
  fill?: string | undefined;
  payload?: unknown;
}>): ReactElement => {
  if (!isMarked(payload)) {
    return <circle cx={cx} cy={cy} r={RADIUS} fill={fill} />;
  }
  const { mark, spot, color } = payload;
  const leader = {
    near: [],
    far: [
      <line
        key="leader"
        x1={cx}
        y1={cy}
        x2={cx + spot.dx * LEADER_RATIO}
        y2={cy + spot.dy * LEADER_RATIO}
        stroke={REFERENCE_COLOR}
      />,
    ],
  } as const;
  return (
    <g>
      {leader[spot.ring]}
      <circle cx={cx} cy={cy} r={RADIUS} fill={color} />
      <text
        x={cx + spot.dx}
        y={cy + spot.dy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={FONT_SIZE}
        className="fill-muted-foreground"
      >
        {mark}
      </text>
    </g>
  );
};

export { MarkedPoint };
