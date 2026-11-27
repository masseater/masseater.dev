import { Audio } from "@remotion/media";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";
import { Sequence } from "remotion";

import type { Timeline } from "#/entities/timeline/index.ts";
import { SFX } from "#/shared/config/index.ts";

const EFFECT_FRAMES = 60;

export const SoundEffects = ({ timeline }: Readonly<{ timeline: Timeline }>): ReactNode =>
  pipe(
    timeline.cues,
    Arr.map(({ at, kind }) => (
      <Sequence
        durationInFrames={EFFECT_FRAMES}
        from={at}
        key={`${kind}-${String(at)}`}
        name={`sfx ${kind}`}
      >
        <Audio src={timeline.sfx[kind]} volume={SFX[kind].volume} />
      </Sequence>
    )),
  );
