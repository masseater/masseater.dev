import { PERCENT, PERCENT_DIGITS, percent, percentRange, usdAmount } from "bench-summary/format";
import type { Interval } from "bench-summary/schema";

const SCORE_DIGITS = 3;
const NO_CHANGE = 0;

export const gap = (value: number): string => {
  const text = percent(value);
  if (value > NO_CHANGE) {
    return `+${text}`;
  }
  return text;
};

const points = (value: number): string => value.toFixed(PERCENT_DIGITS);

export const pointsOf = (value: unknown): string => points(Number(value));

export const toPercentPoints = (ratio: number): number => ratio * PERCENT;

export const usd = (value: number): string => `$${usdAmount(value)}`;

export const withInterval = ({
  value,
  interval,
}: Readonly<{ value: number; interval: Readonly<Interval> }>): string =>
  `${percent(value)}（${percentRange(interval)}）`;

export const decimal = (value: number): string => value.toFixed(SCORE_DIGITS);

export { percent } from "bench-summary/format";
