import { SAMPLE_RATE } from "@masseater.dev/fumx-studio/dsp/number";

const ONE = 1;
const TWO = 2;
const TEN = 10;
const SHELF_STEP = 40;
const DENORMAL = 1e-25;
const SILENT = 0;
const FIRST = 0;

export type Coefficients = readonly [b0: number, b1: number, b2: number, a1: number, a2: number];

export type Kind = "lp" | "hp" | "ap" | "peak" | "high";

interface Angle {
  readonly cosine: number;
  readonly sine: number;
  readonly alpha: number;
  readonly amplitude: number;
  readonly resonance: number;
}

type Raw = readonly [number, number, number, number, number, number];

const highShelf = ({ cosine, sine, amplitude, resonance }: Angle): Raw => {
  const slope =
    TWO *
    Math.sqrt(amplitude) *
    ((sine / TWO) * Math.sqrt((amplitude + ONE / amplitude) * (ONE / resonance - ONE) + TWO));
  const up = amplitude + ONE;
  const down = amplitude - ONE;
  return [
    amplitude * (up + down * cosine + slope),
    -TWO * amplitude * (down + up * cosine),
    amplitude * (up + down * cosine - slope),
    up - down * cosine + slope,
    TWO * (down - up * cosine),
    up - down * cosine - slope,
  ];
};

const DESIGNS: Readonly<Record<Kind, (angle: Angle) => Raw>> = {
  lp: ({ cosine, alpha }) => [
    (ONE - cosine) / TWO,
    ONE - cosine,
    (ONE - cosine) / TWO,
    ONE + alpha,
    -TWO * cosine,
    ONE - alpha,
  ],
  hp: ({ cosine, alpha }) => [
    (ONE + cosine) / TWO,
    -(ONE + cosine),
    (ONE + cosine) / TWO,
    ONE + alpha,
    -TWO * cosine,
    ONE - alpha,
  ],
  ap: ({ cosine, alpha }) => [
    ONE - alpha,
    -TWO * cosine,
    ONE + alpha,
    ONE + alpha,
    -TWO * cosine,
    ONE - alpha,
  ],
  peak: ({ cosine, alpha, amplitude }) => [
    ONE + alpha * amplitude,
    -TWO * cosine,
    ONE - alpha * amplitude,
    ONE + alpha / amplitude,
    -TWO * cosine,
    ONE - alpha / amplitude,
  ],
  high: highShelf,
};

export interface Design {
  readonly kind: Kind;
  readonly hertz: number;
  readonly resonance: number;
  readonly gain?: number;
}

export const designed = ({ kind, hertz, resonance, gain }: Design): Coefficients => {
  const amplitude = TEN ** ((gain ?? SILENT) / SHELF_STEP);
  const omega = (TWO * Math.PI * hertz) / SAMPLE_RATE;
  const sine = Math.sin(omega);
  const [b0, b1, b2, a0, a1, a2] = DESIGNS[kind]({
    cosine: Math.cos(omega),
    sine,
    alpha: sine / (TWO * resonance),
    amplitude,
    resonance,
  });
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
};

export const flushed = (value: number): number => {
  if (Math.abs(value) < DENORMAL) {
    return SILENT;
  }
  return value;
};

export interface Filtering {
  readonly coefficients: Coefficients;
  readonly state: Float64Array;
  readonly slot: number;
}

export const filteredInto =
  ({ coefficients: [b0, b1, b2, a1, a2], state, slot }: Filtering) =>
  (source: Float32Array, target: Float32Array, frames: number): void => {
    let z1 = state[slot] ?? SILENT;
    let z2 = state[slot + ONE] ?? SILENT;
    for (let index = FIRST; index < frames; index += ONE) {
      const value = source[index] ?? SILENT;
      const out = b0 * value + z1;
      z1 = b1 * value - a1 * out + z2;
      z2 = b2 * value - a2 * out;
      target[index] = out;
    }
    state[slot] = flushed(z1);
    state[slot + ONE] = flushed(z2);
  };

export const filtered =
  (filtering: Filtering) =>
  (channel: Float32Array, frames: number): void => {
    filteredInto(filtering)(channel, channel, frames);
  };
