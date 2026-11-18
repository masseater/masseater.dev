import type { MixPlayer, PlayerSetup } from "@masseater.dev/daw-view/worklet";
import { targetsOf } from "@masseater.dev/fumx-studio/live/targets";
import { transportOf } from "@masseater.dev/fumx-studio/live/transport";
import { Option, Schema, pipe } from "effect";

import { CurvesSchema, coreOf, curvesFor, positionOf, seek } from "./core-state.ts";
import { processed } from "./core.ts";

const SILENT = 0;

export const LiveInitSchema = Schema.Struct({
  frames: Schema.Finite,
  drums: Schema.Array(Schema.Boolean),
  curves: CurvesSchema,
});

export type LiveInit = typeof LiveInitSchema.Type;

const initOf = Schema.decodeUnknownOption(LiveInitSchema);

const EMPTY: LiveInit = { frames: SILENT, drums: [], curves: curvesFor(SILENT) };

export const playerOf = ({ init, tape, sampleRate }: PlayerSetup): MixPlayer => {
  const { frames, drums, curves } = pipe(
    initOf(init),
    Option.getOrElse(() => EMPTY),
  );
  const targets = targetsOf(drums.length);
  const core = coreOf({ frames, drums, tape, curves });
  return transportOf({
    targets,
    sampleRate,
    source: {
      frames,
      position: () => positionOf(core),
      seek: (frame) => {
        seek(frame)(core);
      },
      fill: processed({ targets, detect: false })(core),
    },
  });
};
