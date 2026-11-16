import type { ReactNode } from "react";

import { percentOf } from "#/entities/song/index.ts";
import { usePlayback } from "#/features/playback/model/playback.ts";

export const Playhead = (): ReactNode => {
  const { position } = usePlayback();
  return (
    <line
      className="stroke-foreground"
      x1={percentOf(position)}
      x2={percentOf(position)}
      y1="0"
      y2="100%"
    />
  );
};
