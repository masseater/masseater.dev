import { SAMPLE_RATE, boundsOf, orDefault } from "./number.ts";
import type { Span } from "./number.ts";
import constants from "./tuning.json";

const CONTROL_RATE = 16;
const LOWEST_HZ = 10;
const HIGHEST_SHARE = 0.45;
const ONE = 1;
const TWO = 2;
const STEP = 1;
const SILENT = 0;
const AT = { ic1: 0, ic2: 1, a1: 2, a2: 3, a3: 4, band: 5, low: 6, size: 7 } as const;

export type Cutoff = number | ((index: number) => number);

export const SVF = { low: 0, high: 1, band: 2 } as const;

export type SvfKind = (typeof SVF)[keyof typeof SVF];

export interface SvfOptions extends Span {
  readonly kind: SvfKind;
  readonly cutoff: Cutoff;
  readonly resonance?: number;
}

interface SvfRun {
  readonly state: Float64Array;
  readonly damping: number;
  readonly moving: boolean;
  readonly tune: (index: number) => number;
  readonly start: number;
  readonly end: number;
}

export interface Range {
  readonly low: number;
  readonly high: number;
}

export const clamp =
  ({ low, high }: Range) =>
  (value: number): number => {
    if (value < low) {
      return low;
    }
    if (value > high) {
      return high;
    }
    return value;
  };

const audible = clamp({ low: LOWEST_HZ, high: SAMPLE_RATE * HIGHEST_SHARE });

const tuned = (state: Float64Array, hertz: number, damping: number): void => {
  const gain = Math.tan((Math.PI * audible(hertz)) / SAMPLE_RATE);
  const a1 = ONE / (ONE + gain * (gain + damping));
  const a2 = gain * a1;
  state[AT.a1] = a1;
  state[AT.a2] = a2;
  state[AT.a3] = gain * a2;
};

const stepped = (state: Float64Array, input: number): void => {
  const ic1 = state[AT.ic1] ?? SILENT;
  const ic2 = state[AT.ic2] ?? SILENT;
  const a2 = state[AT.a2] ?? SILENT;
  const v3 = input - ic2;
  const v1 = (state[AT.a1] ?? SILENT) * ic1 + a2 * v3;
  const v2 = ic2 + a2 * ic1 + (state[AT.a3] ?? SILENT) * v3;
  state[AT.ic1] = TWO * v1 - ic1;
  state[AT.ic2] = TWO * v2 - ic2;
  state[AT.band] = v1;
  state[AT.low] = v2;
};

const retuned = (run: SvfRun, index: number): void => {
  if (run.moving && (index - run.start) % CONTROL_RATE === SILENT) {
    tuned(run.state, run.tune(index), run.damping);
  }
};

const lowPass = (x: Float32Array, run: SvfRun): void => {
  for (let index = run.start; index < run.end; index += STEP) {
    retuned(run, index);
    stepped(run.state, x[index] ?? SILENT);
    x[index] = run.state[AT.low] ?? SILENT;
  }
};

const highPass = (x: Float32Array, run: SvfRun): void => {
  for (let index = run.start; index < run.end; index += STEP) {
    retuned(run, index);
    const input = x[index] ?? SILENT;
    stepped(run.state, input);
    x[index] = input - run.damping * (run.state[AT.band] ?? SILENT) - (run.state[AT.low] ?? SILENT);
  }
};

const bandPass = (x: Float32Array, run: SvfRun): void => {
  for (let index = run.start; index < run.end; index += STEP) {
    retuned(run, index);
    stepped(run.state, x[index] ?? SILENT);
    x[index] = run.state[AT.band] ?? SILENT;
  }
};

const PASSES: Readonly<Record<SvfKind, (x: Float32Array, run: SvfRun) => void>> = {
  [SVF.low]: lowPass,
  [SVF.high]: highPass,
  [SVF.band]: bandPass,
};

const tuneOf = (cutoff: Cutoff): ((index: number) => number) => {
  if (typeof cutoff === "function") {
    return cutoff;
  }
  return () => cutoff;
};

export const svf =
  ({ kind, cutoff, resonance, ...span }: SvfOptions) =>
  (x: Float32Array): Float32Array => {
    const { start, end } = boundsOf(x.length)(span);
    const damping = ONE / orDefault(constants.defaultResonance)(resonance);
    const tune = tuneOf(cutoff);
    const state = new Float64Array(AT.size);
    tuned(state, tune(start), damping);
    PASSES[kind](x, { state, damping, moving: typeof cutoff === "function", tune, start, end });
    return x;
  };
