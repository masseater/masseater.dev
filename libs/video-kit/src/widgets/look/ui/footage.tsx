import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

import type { Shot } from "#/entities/cut/index.ts";
import type { CssVariables } from "#/shared/lib/css-variables.ts";
import { Box } from "#/shared/ui/box.tsx";

const ZOOM_FROM = 1.04;
const ZOOM_TO = 1.12;
const START = 0;
const NO_RISE = 0;
const END = 1;

const driftOf = (progress: number, rise: number): CssVariables => ({
  "--scale": String(ZOOM_FROM + (ZOOM_TO - ZOOM_FROM) * progress),
  "--y": `${String(-rise * progress)}px`,
});

export const Footage = ({
  shot,
  src,
  rise = NO_RISE,
  className = "",
}: Readonly<{ shot: Shot; src: string; rise?: number; className?: string }>): ReactNode => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [START, shot.duration], [START, END], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill className="overflow-hidden bg-black">
      <Box className={`motion size-full ${className}`} vars={driftOf(progress, rise)}>
        <Img className="size-full object-cover object-top" src={src} />
      </Box>
    </AbsoluteFill>
  );
};
