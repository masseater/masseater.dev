import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { HEIGHT, WIDTH } from "./loading-cell-size.ts";

const RADIUS = 1;
const DIM = 0.15;

const STILL = "";

const PULSES = [
  "animate-cell-pulse-0 motion-reduce:animate-cell-pulse-slow-0",
  "animate-cell-pulse-1 motion-reduce:animate-cell-pulse-slow-1",
  "animate-cell-pulse-2 motion-reduce:animate-cell-pulse-slow-2",
  "animate-cell-pulse-3 motion-reduce:animate-cell-pulse-slow-3",
  "animate-cell-pulse-4 motion-reduce:animate-cell-pulse-slow-4",
] as const;

export const LoadingCell = ({
  left,
  top,
  step,
}: Readonly<{ left: number; top: number; step: number }>): ReactNode => (
  <rect
    x={left}
    y={top}
    width={WIDTH}
    height={HEIGHT}
    rx={RADIUS}
    fill="currentColor"
    opacity={DIM}
    className={pipe(
      Array.get(PULSES, step),
      Option.getOrElse(() => STILL),
    )}
  />
);
