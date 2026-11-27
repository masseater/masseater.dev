import type { Mixer } from "@r_masseater/song-format";

import { decibels } from "#/shared/lib/dsp/number.ts";
import type { PlayedTrack } from "#/shared/lib/plugin/plugin.ts";
import { busOf } from "#/shared/lib/studio/bus.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import { mixInto } from "#/shared/lib/studio/mixing.ts";

import type { Send } from "./params.ts";
import { routesOf } from "./routes.ts";

const NONE = 0;
const ONE = 1;

export interface Stem extends PlayedTrack {
  readonly mixer: Mixer;
}

export interface Routed {
  readonly sends: readonly Send[];
  readonly mixer: Mixer;
}

const faderOf = (mixer: Mixer): number => {
  if (mixer.muted) {
    return NONE;
  }
  return decibels(mixer.volumeDecibels);
};

export const sentOut =
  (frames: number) =>
  (buses: ReadonlyMap<string, Bus>) =>
  (bus: Bus) =>
  ({ sends, mixer }: Routed): void => {
    for (const { into, amount } of routesOf(buses)(sends)) {
      mixInto(frames)({ into, gain: amount * faderOf(mixer) })(bus);
    }
  };

const stemAdded =
  (frames: number) =>
  (mix: Bus) =>
  ({ bus, mixer }: Stem): void => {
    const gain = faderOf(mixer);
    const left = gain * Math.min(ONE, ONE - mixer.pan);
    const right = gain * Math.min(ONE, ONE + mixer.pan);
    for (let index = NONE; index < frames; index += ONE) {
      mix.left[index] = (mix.left[index] ?? NONE) + (bus.left[index] ?? NONE) * left;
      mix.right[index] = (mix.right[index] ?? NONE) + (bus.right[index] ?? NONE) * right;
    }
  };

export const mixedDown =
  (frames: number) =>
  (stems: readonly Stem[]): Bus => {
    const mix = busOf(frames)({});
    for (const stem of stems) {
      stemAdded(frames)(mix)(stem);
    }
    return mix;
  };
