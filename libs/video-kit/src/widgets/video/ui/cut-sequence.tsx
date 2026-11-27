import { Option, Record as Rec } from "effect";
import type { ReactNode } from "react";
import { Sequence } from "remotion";

import type { Shot } from "#/entities/cut/index.ts";

import type { Draw, Frame } from "./draw.ts";
import { Voices } from "./voices.tsx";

const NOTHING_DRAWN = "";

export const CutSequence = ({
  shot,
  draw,
  frame,
}: Readonly<{ shot: Shot; draw: Readonly<Record<string, Draw>>; frame: Frame }>): ReactNode => (
  <Sequence durationInFrames={shot.duration} from={shot.from} name={shot.id}>
    {frame(
      shot,
      Option.match(Rec.get(draw, shot.id), {
        onNone: () => NOTHING_DRAWN,
        onSome: (render) => render(shot),
      }),
    )}
    <Voices lines={shot.lines} />
  </Sequence>
);
