import { Audio } from "@remotion/media";
import type { ReactNode } from "react";
import { Sequence } from "remotion";

import type { Shot } from "#/entities/cut/index.ts";
import type { SfxKind } from "#/shared/config/index.ts";
import { SFX } from "#/shared/config/index.ts";

const EFFECT_FRAMES = 60;

export const Sfx = ({
  shot,
  kind,
  at,
}: Readonly<{ shot: Shot; kind: SfxKind; at: number }>): ReactNode => (
  <Sequence durationInFrames={EFFECT_FRAMES} from={at} layout="none" name={`sfx ${kind}`}>
    <Audio src={shot.sfx[kind]} volume={SFX[kind].volume} />
  </Sequence>
);
