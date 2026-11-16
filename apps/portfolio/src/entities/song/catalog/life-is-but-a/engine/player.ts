import type { MixPlayer, PlayerSetup, TapeSource } from "@masseater.dev/daw-view/worklet";
import { Array as Arr, Option, Schema, pipe } from "effect";

import { SAMPLE_RATE, orDefault } from "#/entities/song/lib/dsp/number.ts";
import { trackAdded } from "#/entities/song/lib/live/tape.ts";
import type { Ramps } from "#/entities/song/lib/live/tape.ts";
import { slide, targetsOf } from "#/entities/song/lib/live/targets.ts";
import type { Targets } from "#/entities/song/lib/live/targets.ts";
import { transportOf } from "#/entities/song/lib/live/transport.ts";
import { clipped, curveAt } from "#/entities/song/lib/studio/curves.ts";

import { MASTER } from "./mastering.ts";

const RAMP = 256;
const SLEW_SECONDS = 6e-3;
const SILENT = 0;
const ONE = 1;

export const LiveInitSchema = Schema.Struct({
  frames: Schema.Finite,
  tracks: Schema.Finite,
  compression: Schema.instanceOf(Float32Array),
  limit: Schema.instanceOf(Float32Array),
});

export type LiveInit = typeof LiveInitSchema.Type;

const initOf = Schema.decodeUnknownOption(LiveInitSchema);

const EMPTY: LiveInit = {
  frames: SILENT,
  tracks: SILENT,
  compression: new Float32Array(),
  limit: new Float32Array(),
};

interface Channels {
  readonly tape: TapeSource;
  readonly targets: Targets;
  readonly gains: Targets;
  readonly ramps: Ramps;
}

const STEP = ONE / (SLEW_SECONDS * SAMPLE_RATE);

const gainsAt = (
  { targets, gains }: Channels,
  track: number,
): readonly [number, number, number, number] => [
  gains.left[track] ?? SILENT,
  gains.right[track] ?? SILENT,
  targets.left[track] ?? SILENT,
  targets.right[track] ?? SILENT,
];

const trackChannelAdded = (
  channels: Channels,
  [left, right]: readonly [Float32Array, Float32Array],
  [position, end, count, track]: readonly [number, number, number, number],
): void => {
  const { tape, gains, ramps } = channels;
  const [left0, right0, left1, right1] = gainsAt(channels, track);
  if (
    pipe(
      [left0, right0, left1, right1],
      Arr.every((gain) => gain === SILENT),
    )
  ) {
    return;
  }
  gains.left[track] = slide({ ramp: ramps.left, frames: count, step: STEP })(left0, left1);
  gains.right[track] = slide({ ramp: ramps.right, frames: count, step: STEP })(right0, right1);
  trackAdded({ tape, track, ramps })(left, right, [position, end]);
};

const channelsAdded =
  (channels: Channels) =>
  (
    left: Float32Array,
    right: Float32Array,
    [position, end, count]: readonly [number, number, number],
  ): void => {
    for (let track = SILENT; track < channels.targets.left.length; track += ONE) {
      trackChannelAdded(channels, [left, right], [position, end, count, track]);
    }
  };

const masteredInto = (
  init: LiveInit,
): ((channel: Float32Array, at: readonly [number, number]) => void) => {
  const compression = curveAt({ curve: init.compression, every: MASTER.compression.every });
  const limit = curveAt({ curve: init.limit, every: MASTER.limit.every });
  const clip = clipped(MASTER.clip);
  return (channel, [position, end]) => {
    for (let frame = SILENT; frame < end; frame += ONE) {
      const at = position + frame;
      channel[frame] = clip((channel[frame] ?? SILENT) * compression(at)) * limit(at);
    }
  };
};

export const playerOf = ({ init, tape, sampleRate }: PlayerSetup): MixPlayer => {
  const setup = Option.getOrElse(initOf(init), () => EMPTY);
  const targets = targetsOf(setup.tracks);
  const added = channelsAdded({
    tape,
    targets,
    gains: targetsOf(setup.tracks),
    ramps: { left: new Float32Array(RAMP), right: new Float32Array(RAMP) },
  });
  const master = masteredInto(setup);
  const cursor = { position: SILENT };
  return transportOf({
    targets,
    ratio: SAMPLE_RATE / orDefault(SAMPLE_RATE)(sampleRate),
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
        added(left, right, [cursor.position, end, count]);
        master(left, [cursor.position, end]);
        master(right, [cursor.position, end]);
        cursor.position += count;
      },
    },
  });
};
