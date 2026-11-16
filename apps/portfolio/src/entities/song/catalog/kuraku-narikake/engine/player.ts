import type { MixPlayer, PlayerSetup } from "@masseater.dev/daw-view/worklet";
import { Option, Schema } from "effect";

import { SAMPLE_RATE, orDefault } from "#/entities/song/lib/dsp/number.ts";
import { targetsOf } from "#/entities/song/lib/live/targets.ts";
import { transportOf } from "#/entities/song/lib/live/transport.ts";

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
  const setup = Option.getOrElse(initOf(init), () => EMPTY);
  const targets = targetsOf(setup.drums.length);
  const core = coreOf({ frames: setup.frames, drums: setup.drums, tape, curves: setup.curves });
  return transportOf({
    targets,
    ratio: SAMPLE_RATE / orDefault(SAMPLE_RATE)(sampleRate),
    source: {
      frames: setup.frames,
      position: () => positionOf(core),
      seek: (frame) => {
        seek(frame)(core);
      },
      fill: processed({ targets, detect: false })(core),
    },
  });
};
