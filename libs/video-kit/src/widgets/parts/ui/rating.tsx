import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { NOTHING } from "#/shared/config/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { slamIn } from "#/shared/ui/motion.ts";
import { Run } from "#/shared/ui/run.tsx";

const STAR = "★";
const DEFAULT_MAX = 5;

const colorOf = (filled: boolean): string => {
  if (filled) {
    return "text-highlight";
  }
  return "text-paper";
};

export const Rating = ({
  score,
  max = DEFAULT_MAX,
  at,
}: Readonly<{ score: number; max?: number; at: readonly number[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const startOf = (position: number): number =>
    Option.getOrElse(Arr.get(at, position), () => NOTHING);
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-star horizontal:text-star-h flex gap-2">
        {pipe(
          Arr.makeBy(max, (position) => position),
          Arr.map((position) => (
            <Run
              className={`motion star-outline font-jp inline-block leading-none font-black ${colorOf(position < score)}`}
              key={String(position)}
              vars={slamIn({ frame, at: startOf(position) })}
            >
              {STAR}
            </Run>
          )),
        )}
      </div>
      <Box
        className="motion font-jp text-star text-ink horizontal:text-star-h leading-none font-black"
        vars={slamIn({ frame, at: startOf(max) })}
      >
        {String(score)}
        <span className="text-label text-muted horizontal:text-label-h">{` / ${String(max)}`}</span>
      </Box>
    </div>
  );
};
