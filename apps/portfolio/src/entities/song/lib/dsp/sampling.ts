import { SAMPLE_RATE } from "./number.ts";

const ONE = 1;
const TWO = 2;
const HALF = 0.5;
const SILENT = 0;
const STEP = 1;
const FIRST = 0;

const sampleAt = (x: Float32Array, index: number): number => x[index] ?? SILENT;

const edge = (x: Float32Array, index: number, fraction: number): number => {
  const last = x.length - ONE;
  if (index < FIRST || index >= last) {
    if (index === last) {
      return sampleAt(x, last) * (ONE - fraction);
    }
    return SILENT;
  }
  const here = sampleAt(x, index);
  return here + (sampleAt(x, index + ONE) - here) * fraction;
};

const cubic = (x: Float32Array, index: number, fraction: number): number => {
  const before = sampleAt(x, index - ONE);
  const here = sampleAt(x, index);
  const next = sampleAt(x, index + ONE);
  const slope = (next - before) * HALF;
  const step = here - next;
  const bend = slope + step;
  const lift = bend + step + (sampleAt(x, index + TWO) - here) * HALF;
  const turn = bend + lift;
  return ((lift * fraction - turn) * fraction + slope) * fraction + here;
};

export const readAt =
  (x: Float32Array) =>
  (position: number): number => {
    const index = Math.floor(position);
    const fraction = position - index;
    if (index < ONE || index >= x.length - TWO) {
      return edge(x, index, fraction);
    }
    return cubic(x, index, fraction);
  };

export interface Resampling {
  readonly rate: number;
  readonly offset?: number;
  readonly length?: number;
}

export const resample =
  ({ rate, offset, length }: Resampling) =>
  (x: Float32Array): Float32Array<ArrayBuffer> => {
    const from = offset ?? SILENT;
    const read = readAt(x);
    const count = Math.max(ONE, Math.floor((length ?? x.length - from) / rate));
    const y = new Float32Array(count);
    for (let index = FIRST; index < count; index += STEP) {
      y[index] = read(from + index * rate);
    }
    return y;
  };

export interface Fades {
  readonly fadeIn: number;
  readonly fadeOut: number;
}

export const fade =
  ({ fadeIn, fadeOut }: Fades) =>
  (x: Float32Array): Float32Array => {
    const rising = Math.round(fadeIn * SAMPLE_RATE);
    const falling = Math.round(fadeOut * SAMPLE_RATE);
    for (let index = FIRST; index < rising && index < x.length; index += STEP) {
      x[index] = sampleAt(x, index) * (index / rising);
    }
    for (let index = FIRST; index < falling && index < x.length; index += STEP) {
      const at = x.length - ONE - index;
      x[at] = sampleAt(x, at) * (index / falling);
    }
    return x;
  };
