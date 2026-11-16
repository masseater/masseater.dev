import { useQuery } from "@tanstack/react-query";
import { Option, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode, RefCallback } from "react";

import { parseEffect } from "#/entities/dance-effect/index.ts";
import { startStage } from "#/features/dance-stage/lib/stage.ts";
import { emptyTrack, trackQuery } from "#/features/dance-stage/model/track.ts";

const WIDTH = 960;
const HEIGHT = 540;

export const DanceStage = ({
  slug,
  source,
  label,
}: Readonly<{ slug: string; source: string; label: string }>): ReactNode => {
  const { data: track = emptyTrack } = useQuery(trackQuery);
  const attach: RefCallback<HTMLCanvasElement> = useCallback(
    (canvas) =>
      pipe(
        Option.fromNullishOr(canvas),
        Option.map((found) =>
          startStage({ canvas: found, slug, effect: parseEffect(source), track }),
        ),
        Option.getOrUndefined,
      ),
    [slug, source, track],
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
