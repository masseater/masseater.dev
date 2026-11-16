import { SAMPLE_RATE, boundsOf, orDefault } from "./number.ts";
import type { Span } from "./number.ts";
import constants from "./tuning.json";

const ONE = 1;
const TWO = 2;
const TEN = 10;
const SHELF_DECIBELS = 40;
const PEAK_RESONANCE = 1;
const STEP = 1;
const SILENT = 0;

export type BiquadKind = "peak" | "low" | "high";

export interface BiquadOptions extends Span {
  readonly kind: BiquadKind;
  readonly hertz: number;
  readonly gain: number;
  readonly resonance?: number;
}

interface Coefficients {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a0: number;
  readonly a1: number;
  readonly a2: number;
}

interface Angle {
  readonly level: number;
  readonly cosine: number;
  readonly sine: number;
  readonly resonance: number | undefined;
}

const peak = ({ level, cosine, sine, resonance }: Angle): Coefficients => {
  const alpha = sine / (TWO * orDefault(PEAK_RESONANCE)(resonance));
  return {
    b0: ONE + alpha * level,
    b1: -TWO * cosine,
    b2: ONE - alpha * level,
    a0: ONE + alpha / level,
    a1: -TWO * cosine,
    a2: ONE - alpha / level,
  };
};

const shelfSlope = ({ level, sine, resonance }: Angle): number => {
  const alpha =
    (sine / TWO) *
    Math.sqrt(
      (level + ONE / level) * (ONE / orDefault(constants.defaultResonance)(resonance) - ONE) + TWO,
    );
  return TWO * Math.sqrt(level) * alpha;
};

const lowShelf = (angle: Angle): Coefficients => {
  const { level, cosine } = angle;
  const slope = shelfSlope(angle);
  return {
    b0: level * (level + ONE - (level - ONE) * cosine + slope),
    b1: TWO * level * (level - ONE - (level + ONE) * cosine),
    b2: level * (level + ONE - (level - ONE) * cosine - slope),
    a0: level + ONE + (level - ONE) * cosine + slope,
    a1: -TWO * (level - ONE + (level + ONE) * cosine),
    a2: level + ONE + (level - ONE) * cosine - slope,
  };
};

const highShelf = (angle: Angle): Coefficients => {
  const { level, cosine } = angle;
  const slope = shelfSlope(angle);
  return {
    b0: level * (level + ONE + (level - ONE) * cosine + slope),
    b1: -TWO * level * (level - ONE + (level + ONE) * cosine),
    b2: level * (level + ONE + (level - ONE) * cosine - slope),
    a0: level + ONE - (level - ONE) * cosine + slope,
    a1: TWO * (level - ONE - (level + ONE) * cosine),
    a2: level + ONE - (level - ONE) * cosine - slope,
  };
};

const DESIGNS: Readonly<Record<BiquadKind, (angle: Angle) => Coefficients>> = {
  peak,
  low: lowShelf,
  high: highShelf,
};

const designed = ({ kind, hertz, gain, resonance }: BiquadOptions): Float64Array => {
  const turn = (TWO * Math.PI * hertz) / SAMPLE_RATE;
  const raw = DESIGNS[kind]({
    level: TEN ** (gain / SHELF_DECIBELS),
    cosine: Math.cos(turn),
    sine: Math.sin(turn),
    resonance,
  });
  return Float64Array.of(
    raw.b0 / raw.a0,
    raw.b1 / raw.a0,
    raw.b2 / raw.a0,
    raw.a1 / raw.a0,
    raw.a2 / raw.a0,
  );
};

const AT = { b0: 0, b1: 1, b2: 2, a1: 3, a2: 4, x1: 5, x2: 6, y1: 7, y2: 8, size: 9 } as const;

const filtered = (state: Float64Array, input: number): number => {
  const x1 = state[AT.x1] ?? SILENT;
  const y1 = state[AT.y1] ?? SILENT;
  const output =
    (state[AT.b0] ?? SILENT) * input +
    (state[AT.b1] ?? SILENT) * x1 +
    (state[AT.b2] ?? SILENT) * (state[AT.x2] ?? SILENT) -
    (state[AT.a1] ?? SILENT) * y1 -
    (state[AT.a2] ?? SILENT) * (state[AT.y2] ?? SILENT);
  state[AT.x2] = x1;
  state[AT.x1] = input;
  state[AT.y2] = y1;
  state[AT.y1] = output;
  return output;
};

export const biquad =
  (options: BiquadOptions) =>
  (x: Float32Array): Float32Array => {
    const { start, end } = boundsOf(x.length)(options);
    const state = new Float64Array(AT.size);
    state.set(designed(options));
    for (let index = start; index < end; index += STEP) {
      x[index] = filtered(state, x[index] ?? SILENT);
    }
    return x;
  };
