import type { ReactNode } from "react";

import type { Position } from "#/shared/lib/player.ts";

import { Ruler } from "./ruler.tsx";
import { Track } from "./track.tsx";
import { useScrub } from "./use-scrub.ts";

export const Timeline = ({
  position,
  seek,
}: Readonly<{ position: Position; seek: (seconds: number) => void }>): ReactNode => {
  const attach = useScrub({ duration: position.duration, seek });
  return (
    <div className="grid gap-1">
      <div ref={attach} className="h-16 cursor-crosshair touch-none select-none">
        <Track position={position} />
      </div>
      <Ruler duration={position.duration} />
    </div>
  );
};
