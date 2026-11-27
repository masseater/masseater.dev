import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import type { Timeline } from "#/entities/cut/index.ts";
import { useFonts } from "#/shared/ui/use-fonts.ts";

import { BackgroundMusic } from "./background-music.tsx";
import { CutSequence } from "./cut-sequence.tsx";
import { DEFAULT_LOOK } from "./default-look.tsx";
import type { Draw, Look } from "./draw.ts";

const NO_CHANGE: Partial<Look> = {};

export const CutVideo = ({
  timeline,
  draw,
  look = NO_CHANGE,
}: Readonly<{
  timeline: Timeline;
  draw: Readonly<Record<string, Draw>>;
  look?: Partial<Look>;
}>): ReactNode => {
  const ready = useFonts();
  const backdrop = look.backdrop ?? DEFAULT_LOOK.backdrop;
  const frame = look.frame ?? DEFAULT_LOOK.frame;
  const overlay = look.overlay ?? DEFAULT_LOOK.overlay;
  const { format, sfx, credits, images, portraits } = timeline;
  return (
    <AbsoluteFill data-format={format} lang="ja">
      {backdrop(timeline)}
      <BackgroundMusic src={timeline.bgm} total={timeline.durationInFrames} />
      {ready &&
        pipe(
          timeline.cuts,
          Arr.map((cut) => ({ ...cut, format, sfx, credits, images, portraits })),
          Arr.map((shot) => <CutSequence draw={draw} frame={frame} key={shot.id} shot={shot} />),
        )}
      {overlay(timeline)}
    </AbsoluteFill>
  );
};
