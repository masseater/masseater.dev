import type { MixPlayer, PlayerSetup, TapeSource } from "@masseater.dev/daw-view/worklet";
import { Array as Arr, Option, pipe } from "effect";

import { SAMPLE_RATE } from "#/shared/lib/dsp/number.ts";

import { trackAdded } from "./tape.ts";
import type { Ramps } from "./tape.ts";
import { slide, targetsOf } from "./targets.ts";
import type { Targets } from "./targets.ts";
import { transportOf } from "./transport.ts";

const RAMP = 256;
const SLEW_SECONDS = 6e-3;
const SILENT = 0;
const ONE = 1;
const STEP = ONE / (SLEW_SECONDS * SAMPLE_RATE);

export type Mastering = (channel: Float32Array, at: readonly [number, number]) => void;

export interface Mixing {
  readonly tape: TapeSource;
  readonly sampleRate: number;
  readonly frames: number;
  readonly tracks: number;
  readonly master: Mastering;
}

interface Channels {
  readonly tape: TapeSource;
  readonly targets: Targets;
  readonly gains: Targets;
  readonly ramps: Ramps;
}

const gainsAt = (
  { targets, gains }: Channels,
  track: number,
): readonly [number, number, number, number] => [
  gains.left[track] ?? SILENT,
  gains.right[track] ?? SILENT,
  targets.left[track] ?? SILENT,
  targets.right[track] ?? SILENT,
];

const trackChannelAdded =
  (channels: Channels) =>
  ([left, right]: readonly [Float32Array, Float32Array]) =>
  ([position, end, count, track]: readonly [number, number, number, number]): void => {
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

const mixPlayerOf = ({ tape, sampleRate, frames, tracks, master }: Mixing): MixPlayer => {
  const targets = targetsOf(tracks);
  const channels: Channels = {
    tape,
    targets,
    gains: targetsOf(tracks),
    ramps: { left: new Float32Array(RAMP), right: new Float32Array(RAMP) },
  };
  const cursor = { position: SILENT };
  return transportOf({
    targets,
    sampleRate,
    source: {
      frames,
      position: () => cursor.position,
      seek: (frame) => {
        cursor.position = Math.max(SILENT, Math.min(frames, Math.round(frame)));
      },
      fill: (left, right, count) => {
        const end = Math.max(SILENT, Math.min(count, frames - cursor.position));
        left.fill(SILENT, SILENT, count);
        right.fill(SILENT, SILENT, count);
        for (let track = SILENT; track < tracks; track += ONE) {
          trackChannelAdded(channels)([left, right])([cursor.position, end, count, track]);
        }
        master(left, [cursor.position, end]);
        master(right, [cursor.position, end]);
        cursor.position += count;
      },
    },
  });
};

export interface Shape {
  readonly frames: number;
  readonly tracks: number;
}

export interface Live<Init extends Shape> {
  readonly decoded: (init: unknown) => Option.Option<Init>;
  readonly empty: Init;
  readonly mastering: (init: Init) => Mastering;
}

export const playerFor =
  <Init extends Shape>({ decoded, empty, mastering }: Live<Init>) =>
  ({ init, tape, sampleRate }: PlayerSetup): MixPlayer => {
    const setup = Option.getOrElse(decoded(init), () => empty);
    return mixPlayerOf({
      tape,
      sampleRate,
      frames: setup.frames,
      tracks: setup.tracks,
      master: mastering(setup),
    });
  };
