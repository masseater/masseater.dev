import type { ReactNode } from "react";

const WHOLE = 100;
const NONE = 0;
const FULL = 1;

const percent = (seconds: number, duration: number): number => {
  if (duration <= NONE) {
    return NONE;
  }
  return Math.min(Math.max(seconds / duration, NONE), FULL) * WHOLE;
};

export const SpanRect = ({
  from,
  to,
  duration,
  lane,
  className,
}: Readonly<{
  from: number;
  to: number;
  duration: number;
  lane: Readonly<{ y: string; height: string }>;
  className: string;
}>): ReactNode => (
  <rect
    x={`${percent(from, duration)}%`}
    width={`${Math.max(percent(to, duration) - percent(from, duration), NONE)}%`}
    y={lane.y}
    height={lane.height}
    className={className}
  />
);
