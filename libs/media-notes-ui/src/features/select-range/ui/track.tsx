import type { ReactNode } from "react";

import type { Span } from "#/features/select-range/model/range.ts";
import type { Position } from "#/shared/lib/player.ts";

import { HEAD, PLAY_LANE, WHOLE_LANE } from "./lanes.ts";
import { RangeLayer } from "./range-layer.tsx";
import { SpanRect } from "./span-rect.tsx";
import { SpansLayer } from "./spans-layer.tsx";

const START = 0;

export const Track = ({
  position,
  spans,
}: Readonly<{ position: Position; spans: readonly Span[] }>): ReactNode => (
  <svg className="size-full overflow-visible" aria-hidden>
    <SpanRect
      from={START}
      to={position.duration}
      duration={position.duration}
      lane={PLAY_LANE}
      className="fill-muted"
    />
    <SpansLayer spans={spans} duration={position.duration} />
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
