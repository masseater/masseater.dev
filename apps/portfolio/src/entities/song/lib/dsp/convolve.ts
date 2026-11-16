import { fft } from "./fft.ts";
import type { Spectrum } from "./fft.ts";

const ONE = 1;
const TWO = 2;
const FIRST = 0;
const STEP = 1;
const SILENT = 0;
const LONG_FACTOR = 4;
const SHORT_FACTOR = 2;
const LARGEST = 524_288;

const forward = fft(false);
const backward = fft(true);

export const blockSizeOf = (length: number): number => {
  let size = ONE;
  while (size < length * LONG_FACTOR) {
    size *= TWO;
  }
  size = Math.min(size, LARGEST);
  while (size < length * SHORT_FACTOR) {
    size *= TWO;
  }
  return size;
};

export const spectrumOf =
  (size: number) =>
  (impulse: Float32Array): Spectrum => {
    const real = new Float64Array(size);
    const imaginary = new Float64Array(size);
    real.set(impulse);
    forward({ real, imaginary });
    return { real, imaginary };
  };

const loaded = (
  block: Spectrum,
  x: Float32Array,
  [from, hop]: readonly [number, number],
): boolean => {
  let heard = false;
  block.real.fill(SILENT);
  block.imaginary.fill(SILENT);
  for (let index = FIRST; index < hop && from + index < x.length; index += STEP) {
    const value = x[from + index] ?? SILENT;
    block.real[index] = value;
    heard ||= value !== SILENT;
  }
  return heard;
};

const multiplied = (block: Spectrum, impulse: Spectrum): void => {
  for (let index = FIRST; index < block.real.length; index += STEP) {
    const re = block.real[index] ?? SILENT;
    const im = block.imaginary[index] ?? SILENT;
    const hr = impulse.real[index] ?? SILENT;
    const hi = impulse.imaginary[index] ?? SILENT;
    block.real[index] = re * hr - im * hi;
    block.imaginary[index] = re * hi + im * hr;
  }
};

export interface Convolution {
  readonly impulse: Float32Array;
  readonly out: Float32Array;
  readonly gain: number;
}

const added = (
  out: Float32Array,
  block: Spectrum,
  [from, gain]: readonly [number, number],
): void => {
  for (let index = FIRST; index < block.real.length && from + index < out.length; index += STEP) {
    out[from + index] = (out[from + index] ?? SILENT) + (block.real[index] ?? SILENT) * gain;
  }
};

export const convolve =
  ({ impulse, out, gain }: Convolution) =>
  (x: Float32Array): void => {
    const size = blockSizeOf(impulse.length);
    const hop = size - impulse.length + ONE;
    const response = spectrumOf(size)(impulse);
    const block = { real: new Float64Array(size), imaginary: new Float64Array(size) };
    for (let from = FIRST; from < x.length; from += hop) {
      if (loaded(block, x, [from, hop])) {
        forward(block);
        multiplied(block, response);
        backward(block);
        added(out, block, [from, gain]);
      }
    }
  };
