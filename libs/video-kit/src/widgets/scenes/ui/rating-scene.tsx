import { Array as Arr, Option } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { Segment } from "#/entities/script/index.ts";
import { NOTHING } from "#/shared/config/index.ts";

import { SceneFrame } from "./scene-frame.tsx";
import type { SceneProps } from "./scene-props.ts";
import { Score } from "./score.tsx";
import { SectionLabel } from "./section-label.tsx";
import { Stars } from "./stars.tsx";

const SCORE_DELAY = 6;

export const RatingScene = ({
  timed,
  number,
  heading,
  score,
  max,
}: Readonly<
  SceneProps & { heading: readonly Segment[]; score: number; max: number }
>): ReactNode => {
  const frame = useCurrentFrame();
  const lastStar = Option.getOrElse(Arr.last(timed.reveals), () => NOTHING);
  return (
    <SceneFrame caption timed={timed} whip>
      <SectionLabel heading={heading} number={number} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <Stars frame={frame} max={max} reveals={timed.reveals} score={score} />
        <Score at={lastStar + SCORE_DELAY} frame={frame} max={max} score={score} />
      </div>
    </SceneFrame>
  );
};
