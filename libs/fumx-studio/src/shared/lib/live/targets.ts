import type { Mixer } from "@masseater.dev/daw-view/worklet";

const SILENT = 0;
const ONE = 1;
const TEN = 10;
const DECIBELS_PER_BEL = 20;

export interface Targets {
  readonly left: Float32Array;
  readonly right: Float32Array;
}

export const targetsOf = (tracks: number): Targets => ({
  left: new Float32Array(tracks).fill(ONE),
  right: new Float32Array(tracks).fill(ONE),
});

const gainOf = ({ muted, volumeDecibels }: Mixer): number => {
  if (muted) {
    return SILENT;
  }
  return TEN ** (volumeDecibels / DECIBELS_PER_BEL);
};

export const aimed =
  ({ left, right }: Targets) =>
  (mixers: readonly Mixer[]): void => {
    for (const [track, mixer] of mixers.entries()) {
      const gain = gainOf(mixer);
      left[track] = gain * Math.min(ONE, ONE - mixer.pan);
      right[track] = gain * Math.min(ONE, ONE + mixer.pan);
    }
  };

export interface Slide {
  readonly ramp: Float32Array;
  readonly frames: number;
  readonly step: number;
}

export const slide =
  ({ ramp, frames, step }: Slide) =>
  (from: number, to: number): number => {
    let gain = from;
    for (let frame = SILENT; frame < frames; frame += ONE) {
      if (gain < to) {
        gain = Math.min(to, gain + step);
      } else if (gain > to) {
        gain = Math.max(to, gain - step);
      }
      ramp[frame] = gain;
    }
    return gain;
  };
