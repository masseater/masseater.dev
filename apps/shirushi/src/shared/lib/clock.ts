import { String as Str } from "effect";

import { clock } from "#/shared/lib/source.ts";

const TENTHS = 10;
const START = 0;
const TENTH_DIGITS = 1;

export const preciseClock = (seconds: number): string => {
  const tenths = Math.floor(Math.max(seconds, START) * TENTHS) % TENTHS;
  return `${clock(seconds)}.${Str.padStart(TENTH_DIGITS, "0")(String(tenths))}`;
};
