import { useQuery } from "@tanstack/react-query";
import { Option, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode, RefCallback } from "react";

import { startStage } from "#/features/dance-stage/lib/stage";
import { parseEffect } from "#/features/dance-stage/model/effect";
import { emptyTrack, trackQuery } from "#/features/dance-stage/model/track";

const WIDTH = 960;
const HEIGHT = 540;

const DanceStage = ({ source, label }: Readonly<{ source: string; label: string }>): ReactNode => {
  const { data: track = emptyTrack } = useQuery(trackQuery);
  const attach: RefCallback<HTMLCanvasElement> = useCallback(
    (canvas) =>
      pipe(
        Option.fromNullishOr(canvas),
        Option.map((found) => startStage({ canvas: found, effect: parseEffect(source), track })),
        Option.getOrUndefined,
      ),
    [source, track],
  );
  return (
    <canvas
      aria-label={label}
      className="bg-muted aspect-video w-full rounded-lg"
      height={HEIGHT}
      ref={attach}
      width={WIDTH}
    />
  );
};

export { DanceStage };
