import { Array as Arr, pipe } from "effect";

const TAPS = 12;
const QUARTER = 0.25;
const HALF = 0.5;
const THREE_QUARTERS = 0.75;
const PHASES = [QUARTER, HALF, THREE_QUARTERS] as const;
const WINDOW = { base: 0.42, first: 0.5, second: 0.08 } as const;
const TINY = 1e-9;
const ONE = 1;
const TWO = 2;
const SILENT = 0;
const FIRST = 0;
const MARGIN = 1.01;
const AFTER = 2;

const sinc = (distance: number): number => {
  if (Math.abs(distance) < TINY) {
    return ONE;
  }
  return Math.sin(Math.PI * distance) / (Math.PI * distance);
};

const kernelOf = (fraction: number): Float32Array => {
  const kernel = new Float32Array(TAPS * TWO);
  for (let tap = FIRST; tap < kernel.length; tap += ONE) {
    const distance = tap - (TAPS - ONE) - fraction;
    const weight =
      WINDOW.base +
      WINDOW.first * Math.cos((Math.PI * distance) / TAPS) +
      WINDOW.second * Math.cos((TWO * Math.PI * distance) / TAPS);
    kernel[tap] = sinc(distance) * weight;
  }
  return kernel;
};

const KERNELS = pipe(
  PHASES,
  Arr.map((phase) => kernelOf(phase)),
);

const between = (channel: Float32Array, index: number, kernel: Float32Array): number => {
  let sum = SILENT;
  for (let tap = FIRST; tap < kernel.length; tap += ONE) {
    sum += (channel[index - (TAPS - ONE) + tap] ?? SILENT) * (kernel[tap] ?? SILENT);
  }
  return Math.abs(sum);
};

const quiet = (channel: Float32Array, index: number, ceiling: number): boolean =>
  Math.abs(channel[index] ?? SILENT) < ceiling * HALF &&
  Math.abs(channel[index + ONE] ?? SILENT) < ceiling * HALF;

export const truePeakAt =
  (ceiling: number) =>
  (channel: Float32Array, index: number): number => {
    if (index < TAPS || index > channel.length - TAPS - AFTER || quiet(channel, index, ceiling)) {
      return SILENT;
    }
    let most = SILENT;
    for (const kernel of KERNELS) {
      most = Math.max(most, between(channel, index, kernel));
    }
    return most * MARGIN;
  };
