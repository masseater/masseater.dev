import { Predicate } from "effect";

export const SAMPLE_RATE = 44_100;

const ZERO = 0;
const OCTAVE = 12;
const TWO = 2;
const DECIBEL_STEP = 20;
const TEN = 10;

export const orDefault =
  (fallback: number) =>
  (value?: number): number => {
    const given = value ?? ZERO;
    if (given === ZERO || Number.isNaN(given)) {
      return fallback;
    }
    return given;
  };

export interface Span {
  readonly from?: number;
  readonly to?: number;
}

export interface Bounds {
  readonly start: number;
  readonly end: number;
}

export const boundsOf =
  (length: number) =>
  ({ from, to }: Span): Bounds => ({ start: orDefault(ZERO)(from), end: to ?? length });

export const semitoneRatio = (semitones: number): number => TWO ** (semitones / OCTAVE);

export const decibels = (level: number): number => TEN ** (level / DECIBEL_STEP);

export const isGiven = (value?: number): value is number =>
  Predicate.isNotUndefined(value) && value !== ZERO && !Number.isNaN(value);
