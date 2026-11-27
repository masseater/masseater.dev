import { Option, Record as Rec } from "effect";
import type { ReactNode } from "react";
import { Sequence } from "remotion";

import type { Shot } from "#/entities/cut/index.ts";

import type { Draw } from "./draw.ts";
import { ShotFrame } from "./shot-frame.tsx";
import { Voices } from "./voices.tsx";

const NOTHING_DRAWN = "";

export const CutSequence = ({
  shot,
  draw,
}: Readonly<{ shot: Shot; draw: Readonly<Record<string, Draw>> }>): ReactNode => (
  <Sequence durationInFrames={shot.duration} from={shot.from} name={shot.id}>
    <ShotFrame lines={shot.lines}>
      {Option.match(Rec.get(draw, shot.id), {
        onNone: () => NOTHING_DRAWN,
        onSome: (render) => render(shot),
      })}
    </ShotFrame>
    <Voices lines={shot.lines} />
  </Sequence>
);
