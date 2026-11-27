import type { ReactNode } from "react";

import { HEIGHT, WIDTH } from "./frame.ts";

const TOP = 0;

export const Playhead = ({ fraction }: Readonly<{ fraction: number }>): ReactNode => (
  <line
    x1={fraction * WIDTH}
    x2={fraction * WIDTH}
    y1={TOP}
    y2={HEIGHT}
    className="stroke-foreground"
    vectorEffect="non-scaling-stroke"
  />
);
