import type { ReactNode } from "react";

import { usePlayback } from "#/features/play-stems/model/playback.ts";
import { percent, shareOf } from "#/shared/lib/index.ts";

export const Playhead = ({ duration }: Readonly<{ duration: number }>): ReactNode => {
  const at = percent(shareOf(duration)(usePlayback().position));
  return (
    <line
      x1={at}
      x2={at}
      y1="0"
      y2="100%"
      className="stroke-foreground"
      vectorEffect="non-scaling-stroke"
    />
  );
};
