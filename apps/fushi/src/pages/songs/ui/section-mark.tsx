import type { ReactNode } from "react";

import type { Section } from "#/entities/song/index.ts";

const WIDTH = 1000;
const HEIGHT = 24;
const BASELINE = 17;
const INSET = 4;
const TOP = 0;

export const SectionMark = ({ section }: Readonly<{ section: Section }>): ReactNode => (
  <g>
    <line
      x1={section.at * WIDTH}
      x2={section.at * WIDTH}
      y1={TOP}
      y2={HEIGHT}
      className="stroke-border"
    />
    <text x={section.at * WIDTH + INSET} y={BASELINE} className="fill-muted-foreground text-sm">
      {section.name}
    </text>
  </g>
);
