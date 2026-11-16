import type { ReactNode } from "react";

import type { Position } from "#/shared/lib/player";

import { HEAD, PLAY_LANE, WHOLE_LANE } from "./lanes.ts";
import { MarkLayer } from "./mark-layer.tsx";
import { RangeLayer } from "./range-layer.tsx";
import { SpanRect } from "./span-rect.tsx";

const START = 0;

export const Track = ({ position }: Readonly<{ position: Position }>): ReactNode => (
  <svg className="size-full overflow-visible" aria-hidden>
    <SpanRect
      from={START}
      to={position.duration}
      duration={position.duration}
      lane={PLAY_LANE}
      className="fill-muted"
    />
    <MarkLayer duration={position.duration} />
    <RangeLayer duration={position.duration} />
    <SpanRect
      from={position.current}
      to={position.current + HEAD}
      duration={position.duration}
      lane={WHOLE_LANE}
      className="fill-foreground"
    />
  </svg>
);
