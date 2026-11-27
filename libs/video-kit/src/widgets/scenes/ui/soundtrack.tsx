import type { ReactNode } from "react";

import type { Timeline } from "#/entities/script/index.ts";

import { BackgroundMusic } from "./background-music.tsx";
import { SoundEffects } from "./sound-effects.tsx";

export const Soundtrack = ({ timeline }: Readonly<{ timeline: Timeline }>): ReactNode => (
  <>
    <BackgroundMusic src={timeline.bgm} total={timeline.durationInFrames} />
    <SoundEffects timeline={timeline} />
  </>
);
