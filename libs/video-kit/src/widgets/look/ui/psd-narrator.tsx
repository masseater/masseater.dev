import type { Part } from "@masseater.dev/tachie";
import { PsdCharacter } from "@masseater.dev/tachie";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { recordingsOf } from "#/entities/cut/index.ts";
import type { Timeline } from "#/entities/cut/index.ts";
import type { CssVariables } from "#/shared/lib/css-variables.ts";
import { Box } from "#/shared/ui/box.tsx";
import { hopOf } from "#/widgets/look/model/hop.ts";

const BREATH_FRAMES = 96;
const BREATH_DEPTH = 0.008;
const FULL = 1;
const TURN = Math.PI + Math.PI;

const breathOf = (frame: number): number =>
  FULL + BREATH_DEPTH * Math.sin((TURN * frame) / BREATH_FRAMES);

const poseOf = (hop: number, frame: number): CssVariables => ({
  "--y": `${String(hop)}px`,
  "--scale": `1 ${String(breathOf(frame))}`,
});

export const PsdNarrator = ({
  timeline,
  psd,
  parts,
  className,
}: Readonly<{
  timeline: Timeline;
  psd: string;
  parts: readonly Part[];
  className: string;
}>): ReactNode => {
  const frame = useCurrentFrame();
  const speakers = pipe(
    timeline.cuts,
    Arr.map(({ voice }) => voice),
  );
  const hop = hopOf({ cuts: timeline.cuts, voices: speakers, frame });
  return (
    <Box
      className={`motion pointer-events-none absolute origin-bottom ${className}`}
      vars={poseOf(hop, frame)}
    >
      <PsdCharacter
        className="size-full"
        parts={parts}
        psd={psd}
        voices={recordingsOf(timeline.cuts)}
      />
    </Box>
  );
};
