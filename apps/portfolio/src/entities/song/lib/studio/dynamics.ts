import { SAMPLE_RATE, decibels, isGiven, orDefault } from "#/entities/song/lib/dsp/number.ts";

import type { Bus } from "./bus.ts";

const ONE = 1;
const TWO = 2;
const HALF = 0.5;
const SILENT = 0;
const FIRST = 0;
const STEP = 1;
const MILLI = 1e-3;
const SIDE_SHARE = 0.7;
const AT = { envelope: 0, highPass: 1, most: 2, side: 3, size: 4 } as const;

export const onePole = (hertz: number): number =>
  ONE - Math.exp((-TWO * Math.PI * hertz) / SAMPLE_RATE);

const poleOrNone = (hertz: number | undefined): number => {
  if (!isGiven(hertz)) {
    return SILENT;
  }
  return onePole(hertz);
};

export interface Widening {
  readonly width: number;
  readonly monoBelow?: number;
}

const widened = (
  bus: Bus,
  state: Float64Array,
  [index, width, pole]: readonly [number, number, number],
): void => {
  const left = bus.left[index] ?? SILENT;
  const right = bus.right[index] ?? SILENT;
  const mid = (left + right) * HALF;
  let side = (left - right) * HALF * width;
  if (pole !== SILENT) {
    state[AT.side] = (state[AT.side] ?? SILENT) + pole * (side - (state[AT.side] ?? SILENT));
    side -= state[AT.side] ?? SILENT;
  }
  bus.left[index] = mid + side;
  bus.right[index] = mid - side;
};

export const widen =
  (frames: number) =>
  ({ width, monoBelow }: Widening) =>
  (bus: Bus): void => {
    const pole = poleOrNone(monoBelow);
    const state = new Float64Array(AT.size);
    for (let index = FIRST; index < frames; index += STEP) {
      widened(bus, state, [index, width, pole]);
    }
  };

export interface Compression {
  readonly threshold: number;
  readonly ratio: number;
  readonly attack: number;
  readonly release: number;
  readonly makeup?: number;
  readonly sidechainHighPass?: number;
}

interface Compressor {
  readonly threshold: number;
  readonly slope: number;
  readonly attack: number;
  readonly release: number;
  readonly makeup: number;
  readonly highPass: number;
  readonly state: Float64Array;
}

export const smoothingOf = (milliseconds: number): number =>
  Math.exp(-ONE / (milliseconds * MILLI * SAMPLE_RATE));

const compressorOf = (settings: Compression): Compressor => ({
  threshold: decibels(settings.threshold),
  slope: ONE / settings.ratio - ONE,
  attack: smoothingOf(settings.attack),
  release: smoothingOf(settings.release),
  makeup: decibels(orDefault(SILENT)(settings.makeup)),
  highPass: poleOrNone(settings.sidechainHighPass),
  state: new Float64Array(AT.size),
});

const detected = ({ highPass, state }: Compressor, left: number, right: number): number => {
  let mid = (left + right) * HALF;
  if (highPass !== SILENT) {
    state[AT.highPass] =
      (state[AT.highPass] ?? SILENT) + highPass * (mid - (state[AT.highPass] ?? SILENT));
    mid -= state[AT.highPass] ?? SILENT;
  }
  return Math.max(Math.abs(mid), Math.abs(left) * SIDE_SHARE, Math.abs(right) * SIDE_SHARE) * ONE;
};

const followed = (compressor: Compressor, level: number): number => {
  const { attack, release, state } = compressor;
  const envelope = state[AT.envelope] ?? SILENT;
  if (level > envelope) {
    return attack * envelope + (ONE - attack) * level;
  }
  return release * envelope + (ONE - release) * level;
};

const reduction = (compressor: Compressor, envelope: number): number => {
  if (envelope > compressor.threshold) {
    const gain = (envelope / compressor.threshold) ** compressor.slope;
    if (ONE - gain > (compressor.state[AT.most] ?? SILENT)) {
      compressor.state[AT.most] = ONE - gain;
    }
    return gain;
  }
  return ONE;
};

const compressed = (bus: Bus, compressor: Compressor, index: number): void => {
  const left = bus.left[index] ?? SILENT;
  const right = bus.right[index] ?? SILENT;
  const envelope = followed(compressor, detected(compressor, left, right));
  compressor.state[AT.envelope] = envelope;
  const gain = reduction(compressor, envelope) * compressor.makeup;
  bus.left[index] = left * gain;
  bus.right[index] = (bus.right[index] ?? SILENT) * gain;
};

export const compress =
  (frames: number) =>
  (settings: Compression) =>
  (bus: Bus): number => {
    const compressor = compressorOf(settings);
    for (let index = FIRST; index < frames; index += STEP) {
      compressed(bus, compressor, index);
    }
    return compressor.state[AT.most] ?? SILENT;
  };

export interface GainCurve {
  readonly curve: Float32Array<ArrayBuffer>;
  readonly most: number;
}

export interface CurveCompression extends Compression {
  readonly every: number;
}

export const heldCurve =
  (frames: number) =>
  ({ every, level }: Readonly<{ every: number; level: number }>): Float32Array<ArrayBuffer> =>
    new Float32Array(Math.ceil(frames / every) + TWO).fill(level);

const stepped = (compressor: Compressor, bus: Bus, index: number): number => {
  const level = detected(compressor, bus.left[index] ?? SILENT, bus.right[index] ?? SILENT);
  compressor.state[AT.envelope] = followed(compressor, level);
  return reduction(compressor, compressor.state[AT.envelope] ?? SILENT);
};

export const compressionCurve =
  (frames: number) =>
  ({ every, ...settings }: CurveCompression) =>
  (bus: Bus): GainCurve => {
    const compressor = compressorOf(settings);
    const curve = heldCurve(frames)({ every, level: compressor.makeup });
    let gain = ONE;
    for (let index = FIRST; index < frames; index += STEP) {
      gain = stepped(compressor, bus, index);
      if (index % every === SILENT) {
        curve[index / every] = gain * compressor.makeup;
      }
    }
    curve.fill(gain * compressor.makeup, Math.floor((frames - ONE) / every) + ONE);
    return { curve, most: compressor.state[AT.most] ?? SILENT };
  };
