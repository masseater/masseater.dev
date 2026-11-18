import { decibels } from "@masseater.dev/fumx-studio/dsp/number";

import { interpolated, kneed } from "./core-drums.ts";
import type { Core, Smoothing } from "./core-state.ts";
import { positionOf } from "./core-state.ts";
import { MASTER } from "./mastering.ts";

const ONE = 1;
const TWO = 2;
const DECIBELS = 20;
const FLOOR = 1e-9;
const SILENT = 0;
const FIRST = 0;
const ENVELOPE = 2;
const LOW = 0;
const MID = 1;
const HIGH = 2;
const BANDS = [LOW, MID, HIGH] as const;

type Band = (typeof MASTER.bands)[number];

type Triple = readonly [Float32Array, Float32Array, Float32Array];

const gainOf = (envelope: number, band: Band): number => {
  const over = DECIBELS * Math.log10(envelope + FLOOR) - band.threshold;
  const slope = ONE / band.ratio - ONE;
  let reduction = SILENT;
  if (over > band.knee / TWO) {
    reduction = slope * over;
  } else if (over > -band.knee / TWO) {
    reduction = (slope * (over + band.knee / TWO) * (over + band.knee / TWO)) / (TWO * band.knee);
  }
  return decibels(reduction + band.makeup);
};

const followed = ({ attack, release }: Smoothing, envelope: number, level: number): number => {
  if (level > envelope) {
    return attack * envelope + (ONE - attack) * level;
  }
  return release * envelope + (ONE - release) * level;
};

const curvesOf = ({ curves }: Core): Triple => [curves.low, curves.mid, curves.high];

const [lowClipped, midClipped, highClipped] = [
  kneed(MASTER.bands[LOW].clip),
  kneed(MASTER.bands[MID].clip),
  kneed(MASTER.bands[HIGH].clip),
] as const;

const masterClipped = kneed(MASTER.clip);

const detected = (core: Core, [index, offset, window]: readonly [number, number, number]): void => {
  const [left, right] = core.buffers.bands;
  const curves = curvesOf(core);
  for (const band of BANDS) {
    const slot = ENVELOPE + band;
    const envelope = core.envelopes[slot] ?? SILENT;
    if (offset === SILENT) {
      curves[band][window + ONE] = gainOf(envelope, MASTER.bands[band]);
    }
    const level = Math.max(
      Math.abs(left[band][index] ?? SILENT),
      Math.abs(right[band][index] ?? SILENT),
    );
    core.envelopes[slot] = followed(core.bands[band] ?? core.drum, envelope, level);
  }
};

const summed = (
  [low, mid, high]: Triple,
  index: number,
  [lowGain, midGain, highGain]: readonly [number, number, number],
): number =>
  masterClipped(
    (lowClipped((low[index] ?? SILENT) * lowGain) +
      midClipped((mid[index] ?? SILENT) * midGain) +
      highClipped((high[index] ?? SILENT) * highGain)) *
      MASTER.gain,
  );

const gainsAt = (
  core: Core,
  window: number,
  fraction: number,
): readonly [number, number, number] => {
  const [low, mid, high] = curvesOf(core);
  return [
    interpolated(low)(window, fraction),
    interpolated(mid)(window, fraction),
    interpolated(high)(window, fraction),
  ];
};

const frameBanded = (core: Core, index: number, detect: boolean): void => {
  const [left, right] = core.buffers.bands;
  const at = positionOf(core) + index;
  const window = Math.trunc(at / MASTER.every);
  const offset = at - window * MASTER.every;
  if (detect) {
    detected(core, [index, offset, window]);
  }
  const gains = gainsAt(core, window, offset / MASTER.every);
  core.buffers.left[index] = summed(left, index, gains);
  core.buffers.right[index] = summed(right, index, gains);
};

export interface Banding {
  readonly frames: number;
  readonly detect: boolean;
}

export const banded =
  ({ frames, detect }: Banding) =>
  (core: Core): void => {
    for (let index = FIRST; index < frames; index += ONE) {
      frameBanded(core, index, detect);
    }
  };
