import type { Interval } from "./summary.ts";

const PERCENT = 100;
const PERCENT_DIGITS = 1;
const COST_DIGITS = 4;

const percent = (value: number): string => (value * PERCENT).toFixed(PERCENT_DIGITS);

const percentRange = ({ lower, upper }: Readonly<Interval>): string =>
  `${percent(lower)}〜${percent(upper)}`;

const usdAmount = (value: number): string => value.toFixed(COST_DIGITS);

export { PERCENT, PERCENT_DIGITS, percent, percentRange, usdAmount };
