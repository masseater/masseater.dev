import type { MixPlayer, PlayerSetup, TapeSource } from "@masseater.dev/daw-view/worklet";
import { Array as Arr, Option, Schema, pipe } from "effect";

import { SAMPLE_RATE } from "#/shared/lib/dsp/number.ts";
import { trackAdded } from "#/shared/lib/live/tape.ts";
import type { Ramps } from "#/shared/lib/live/tape.ts";
import { slide, targetsOf } from "#/shared/lib/live/targets.ts";
import type { Targets } from "#/shared/lib/live/targets.ts";
import { transportOf } from "#/shared/lib/live/transport.ts";
import { curveAt } from "#/shared/lib/studio/curves.ts";

const RAMP = 256;
const SLEW_SECONDS = 6e-3;
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

interface Channels {
  readonly tape: TapeSource;
  readonly targets: Targets;
  readonly gains: Targets;
  readonly ramps: Ramps;
  readonly step: number;
}

const trackChannelAdded =
  (channels: Channels) =>
  ([left, right]: readonly [Float32Array, Float32Array]) =>
  ([position, end, count, track]: readonly [number, number, number, number]): void => {
    const { tape, gains, targets, ramps, step } = channels;
    const from = [gains.left[track] ?? SILENT, gains.right[track] ?? SILENT] as const;
    const to = [targets.left[track] ?? SILENT, targets.right[track] ?? SILENT] as const;
    if (
      pipe(
        [...from, ...to],
        Arr.every((gain) => gain === SILENT),
      )
    ) {
      return;
    }
    const [fromLeft, fromRight] = from;
    const [toLeft, toRight] = to;
    gains.left[track] = slide({ ramp: ramps.left, frames: count, step })(fromLeft, toLeft);
    gains.right[track] = slide({ ramp: ramps.right, frames: count, step })(fromRight, toRight);
    trackAdded({ tape, track, ramps })(left, right, [position, end]);
  };

const masteredInto = (init: LiveInit) => {
  const stages = pipe(
    init.stages,
    Arr.map((curve) => curveAt({ curve, every: init.every })),
  );
  return (channel: Float32Array, [position, end]: readonly [number, number]): void => {
    for (let frame = SILENT; frame < end; frame += ONE) {
      let value = channel[frame] ?? SILENT;
      for (const stage of stages) {
        value *= stage(position + frame);
      }
      channel[frame] = value;
    }
  };
};

export const playerOf = ({ init, tape, sampleRate }: PlayerSetup): MixPlayer => {
  const setup = Option.getOrElse(initOf(init), () => EMPTY);
  const targets = targetsOf(setup.tracks);
  const channels: Channels = {
    tape,
    targets,
    gains: targetsOf(setup.tracks),
    ramps: { left: new Float32Array(RAMP), right: new Float32Array(RAMP) },
    step: ONE / (SLEW_SECONDS * SAMPLE_RATE),
  };
  const master = masteredInto(setup);
  const cursor = { position: SILENT };
  return transportOf({
    targets,
    sampleRate,
    source: {
      frames: setup.frames,
      position: () => cursor.position,
      seek: (frame) => {
        cursor.position = Math.max(SILENT, Math.min(setup.frames, Math.round(frame)));
      },
      fill: (left, right, count) => {
        const end = Math.max(SILENT, Math.min(count, setup.frames - cursor.position));
        left.fill(SILENT, SILENT, count);
        right.fill(SILENT, SILENT, count);
        for (let track = SILENT; track < setup.tracks; track += ONE) {
          trackChannelAdded(channels)([left, right])([cursor.position, end, count, track]);
        }
        master(left, [cursor.position, end]);
        master(right, [cursor.position, end]);
        cursor.position += count;
      },
    },
  });
};
