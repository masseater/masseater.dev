import type { MixPlayer, PlayerSetup } from "@masseater.dev/daw-view/worklet";
import { Array as Arr, Match, Schema, pipe } from "effect";

import { playerFor } from "#/shared/lib/live/mixer.ts";
import type { Mastering } from "#/shared/lib/live/mixer.ts";
import { clipped, curveAt } from "#/shared/lib/studio/curves.ts";

const SILENT = 0;
const ONE = 1;

const StageSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("gain"),
    curve: Schema.instanceOf(Float32Array),
    every: Schema.Finite,
  }),
  Schema.Struct({ kind: Schema.Literal("clip"), threshold: Schema.Finite, knee: Schema.Finite }),
]);

type Stage = typeof StageSchema.Type;

export const LiveInitSchema = Schema.Struct({
  frames: Schema.Finite,
  tracks: Schema.Finite,
  stages: Schema.Array(StageSchema),
});

export type LiveInit = typeof LiveInitSchema.Type;

const initOf = Schema.decodeUnknownOption(LiveInitSchema);

const EMPTY: LiveInit = { frames: SILENT, tracks: SILENT, stages: [] };

type Step = (value: number, at: number) => number;

const stepOf = (stage: Stage): Step =>
  Match.value(stage).pipe(
    Match.discriminatorsExhaustive("kind")({
      gain: ({ curve, every }): Step => {
        const level = curveAt({ curve, every });
        return (value, at) => value * level(at);
      },
      clip: (knee): Step => {
        const clip = clipped(knee);
        return (value) => clip(value);
      },
    }),
  );

const masteredInto = (init: LiveInit): Mastering => {
  const steps = pipe(init.stages, Arr.map(stepOf));
  return (channel, [position, end]) => {
    for (let frame = SILENT; frame < end; frame += ONE) {
      let value = channel[frame] ?? SILENT;
      for (const step of steps) {
        value = step(value, position + frame);
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
