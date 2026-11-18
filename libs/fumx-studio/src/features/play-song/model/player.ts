import type { MixPlayer, PlayerSetup } from "@masseater.dev/daw-view/worklet";
import { Array as Arr, Schema, pipe } from "effect";

import { playerFor } from "#/shared/lib/live/mixer.ts";
import type { Mastering } from "#/shared/lib/live/mixer.ts";
import { curveAt } from "#/shared/lib/studio/curves.ts";

const SILENT = 0;
const ONE = 1;

export const LiveInitSchema = Schema.Struct({
  frames: Schema.Finite,
  tracks: Schema.Finite,
  every: Schema.Finite,
  stages: Schema.Array(Schema.instanceOf(Float32Array)),
});

export type LiveInit = typeof LiveInitSchema.Type;

const initOf = Schema.decodeUnknownOption(LiveInitSchema);

const EMPTY: LiveInit = { frames: SILENT, tracks: SILENT, every: ONE, stages: [] };

const masteredInto = (init: LiveInit): Mastering => {
  const stages = pipe(
    init.stages,
    Arr.map((curve) => curveAt({ curve, every: init.every })),
  );
  return (channel, [position, end]) => {
    for (let frame = SILENT; frame < end; frame += ONE) {
      let value = channel[frame] ?? SILENT;
      for (const stage of stages) {
        value *= stage(position + frame);
      }
      channel[frame] = value;
    }
  };
};

export const playerOf: (setup: PlayerSetup) => MixPlayer = playerFor({
  decoded: initOf,
  empty: EMPTY,
  mastering: masteredInto,
});
