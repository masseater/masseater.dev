import { Option, pipe } from "effect";

import { groupsOf } from "./groups.ts";

export const TICKS_PER_WHOLE = 13_440;

const FRACTION = /^(?<numerator>\d+)\/(?<denominator>\d+)$/u;
const NONE = 0;

export interface Fraction {
  readonly numerator: number;
  readonly denominator: number;
}

const gcdOf = (left: number, right: number): number => {
  if (right === NONE) {
    return left;
  }
  return gcdOf(right, left % right);
};

export const partsOf = (text: string): Option.Option<Fraction> =>
  pipe(
    groupsOf(FRACTION)(text),
    Option.flatMap(({ numerator, denominator }) =>
      Option.all({
        numerator: Option.fromNullishOr(numerator),
        denominator: Option.fromNullishOr(denominator),
      }),
    ),
    Option.map(({ numerator, denominator }) => ({
      numerator: Number(numerator),
      denominator: Number(denominator),
    })),
    Option.filter(({ denominator }) => denominator > NONE),
  );

export const ticksOf = (text: string): Option.Option<number> =>
  pipe(
    partsOf(text),
    Option.map(({ numerator, denominator }) => (TICKS_PER_WHOLE * numerator) / denominator),
    Option.filter(Number.isInteger),
  );

export const fractionOf = (ticks: number): string => {
  if (ticks === NONE) {
    return "0";
  }
  const divisor = gcdOf(ticks, TICKS_PER_WHOLE);
  return `${String(ticks / divisor)}/${String(TICKS_PER_WHOLE / divisor)}`;
};
