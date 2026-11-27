import { Array as Arr, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";
import { Sequence } from "remotion";

import type { Timeline } from "#/entities/script/index.ts";
import { numbered } from "#/widgets/scenes/model/numbered.ts";

import type { SceneOverride } from "./scene-props.ts";
import { SceneSlot } from "./scene-slot.tsx";
import { Voices } from "./voices.tsx";

export const Scenes = ({
  timeline,
  overrides,
}: Readonly<{
  timeline: Timeline;
  overrides: Readonly<Record<string, SceneOverride>>;
}>): ReactNode =>
  pipe(
    numbered(timeline.scenes),
    Arr.map(({ timed, number }) => (
      <Sequence
        durationInFrames={timed.duration}
        from={timed.from}
        key={timed.scene.id}
        name={timed.scene.id}
      >
        <SceneSlot
          credits={timeline.credits}
          format={timeline.format}
          number={number}
          override={pipe(overrides, Rec.get(timed.scene.id))}
          timed={timed}
        />
        <Voices lines={timed.lines} />
      </Sequence>
    )),
  );
