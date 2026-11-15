import type { Interval } from "./summary.ts";

export const PERCENT = 100;
export const PERCENT_DIGITS = 1;
const COST_DIGITS = 4;

export const percent = (value: number): string => (value * PERCENT).toFixed(PERCENT_DIGITS);

export const percentRange = ({ lower, upper }: Readonly<Interval>): string =>
  `${percent(lower)}〜${percent(upper)}`;

export const usdAmount = (value: number): string => value.toFixed(COST_DIGITS);
