import { Option, pipe } from "effect";

import { fft } from "./fft.ts";
import type { Spectrum } from "./fft.ts";

const ONE = 1;
const TWO = 2;
const FIRST = 0;
const SILENT = 0;
const LONG_FACTOR = 8;
const LARGEST = 1_048_576;

const forward = fft(false);
const backward = fft(true);

export interface Impulse {
  readonly left: Float32Array;
  readonly right: Float32Array;
}

const sizeOf = (length: number): number => {
  let size = ONE;
  while (size < length * LONG_FACTOR) {
    size *= TWO;
  }
  size = Math.min(size, LARGEST);
  while (size < length * TWO) {
    size *= TWO;
  }
  return size;
};

const responses = new WeakMap<Float32Array, Spectrum>();

const computed = ({ left, right }: Impulse, size: number): Spectrum => {
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  real.set(left);
  imaginary.set(right);
  forward({ real, imaginary });
  responses.set(left, { real, imaginary });
  return { real, imaginary };
};

const responseOf = (impulse: Impulse, size: number): Spectrum =>
  pipe(
    Option.fromUndefinedOr(responses.get(impulse.left)),
    Option.filter((found) => found.real.length === size),
    Option.getOrElse(() => computed(impulse, size)),
  );

const loaded = (
  block: Spectrum,
  input: Float32Array,
  [from, hop]: readonly [number, number],
): boolean => {
  let heard = false;
  block.real.fill(SILENT);
  block.imaginary.fill(SILENT);
  for (let index = FIRST; index < hop && from + index < input.length; index += ONE) {
    const value = input[from + index] ?? SILENT;
    block.real[index] = value;
    heard ||= value !== SILENT;
  }
  return heard;
};

const multiplied = (block: Spectrum, response: Spectrum): void => {
  for (let index = FIRST; index < block.real.length; index += ONE) {
    const re = block.real[index] ?? SILENT;
    const im = block.imaginary[index] ?? SILENT;
    const hr = response.real[index] ?? SILENT;
    const hi = response.imaginary[index] ?? SILENT;
    block.real[index] = re * hr - im * hi;
    block.imaginary[index] = re * hi + im * hr;
  }
};

const convolved = (block: Spectrum, response: Spectrum): void => {
  forward(block);
  multiplied(block, response);
  backward(block);
};

export interface Pair {
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
}

const added = (out: Pair, block: Spectrum, [from, gain]: readonly [number, number]): void => {
  for (
    let index = FIRST;
    index < block.real.length && from + index < out.left.length;
    index += ONE
  ) {
    out.left[from + index] =
      (out.left[from + index] ?? SILENT) + (block.real[index] ?? SILENT) * gain;
    out.right[from + index] =
      (out.right[from + index] ?? SILENT) + (block.imaginary[index] ?? SILENT) * gain;
  }
};

export interface PairConvolution {
  readonly impulse: Impulse;
  readonly gain: number;
  readonly frames: number;
}

export const convolvePair =
  ({ impulse, gain, frames }: PairConvolution) =>
  (input: Float32Array): Pair => {
    const size = sizeOf(impulse.left.length);
    const hop = size - impulse.left.length + ONE;
    const response = responseOf(impulse, size);
    const out = { left: new Float32Array(frames), right: new Float32Array(frames) };
    const block = { real: new Float64Array(size), imaginary: new Float64Array(size) };
    for (let from = FIRST; from < input.length; from += hop) {
      if (loaded(block, input, [from, hop])) {
        convolved(block, response);
        added(out, block, [from, gain]);
      }
    }
    return out;
  };
