import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Lane } from "#/entities/song/index.ts";

import { LaneRow } from "./lane-row.tsx";

const WIDTH = 100;
const HEIGHT = 10;
const INSET = 2;

export const TrackLane = ({ lane }: Readonly<{ lane: Lane }>): ReactNode => (
  <LaneRow label={lane.track}>
    <svg
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      className="bg-muted/50 h-5 w-full rounded-sm border"
      aria-hidden
    >
      {pipe(
        lane.spans,
        Arr.map(([start, end]) => (
          <rect
            key={start}
            x={start * WIDTH}
            y={INSET}
            width={(end - start) * WIDTH}
            height={HEIGHT - INSET - INSET}
            className="fill-muted-foreground"
          />
        )),
      )}
    </svg>
  </LaneRow>
);
