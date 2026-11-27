import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import type { Timeline } from "#/entities/cut/index.ts";
import { useFonts } from "#/shared/ui/use-fonts.ts";

import { BackgroundMusic } from "./background-music.tsx";
import { CutSequence } from "./cut-sequence.tsx";
import type { Draw } from "./draw.ts";
import { Tachie } from "./tachie.tsx";

export const CutVideo = ({
  timeline,
  draw,
}: Readonly<{ timeline: Timeline; draw: Readonly<Record<string, Draw>> }>): ReactNode => {
  const ready = useFonts();
  const { format, sfx, credits } = timeline;
  return (
    <AbsoluteFill className="bg-paper" data-format={format} lang="ja">
      <BackgroundMusic src={timeline.bgm} total={timeline.durationInFrames} />
      {ready &&
        pipe(
          timeline.cuts,
          Arr.map((cut) => ({ ...cut, format, sfx, credits })),
          Arr.map((shot) => <CutSequence draw={draw} key={shot.id} shot={shot} />),
        )}
      <Tachie cuts={timeline.cuts} images={timeline.tachie} />
    </AbsoluteFill>
  );
};
