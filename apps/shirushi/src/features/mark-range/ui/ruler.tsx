import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { clock } from "#/shared/lib/source";

const WHOLE = 100;
const SHORT_SONG = 600;
const SHORT_STEP = 30;
const LONG_STEP = 60;
const FIRST = 0;

const stepFor = (duration: number): number => {
  if (duration <= SHORT_SONG) {
    return SHORT_STEP;
  }
  return LONG_STEP;
};

export const Ruler = ({ duration }: Readonly<{ duration: number }>): ReactNode => {
  if (duration <= FIRST) {
    return false;
  }
  const step = stepFor(duration);
  const ticks = pipe(
    Arr.range(FIRST, Math.floor(duration / step)),
    Arr.map((index) => index * step),
  );
  return (
    <svg className="h-4 w-full overflow-visible" aria-hidden>
      {pipe(
        ticks,
        Arr.map((seconds) => (
          <text
            key={seconds}
            x={`${(seconds / duration) * WHOLE}%`}
            y="75%"
            className="fill-muted-foreground font-mono text-xs tabular-nums"
          >
            {clock(seconds)}
          </text>
        )),
      )}
    </svg>
  );
};
