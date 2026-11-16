import { String as Str } from "effect";

const SECONDS_PER_MINUTE = 60;
const START = 0;
const CLOCK_DIGITS = 2;
const TENTHS = 10;
const TENTH_DIGITS = 1;

const whole = (seconds: number): number => Math.max(Math.floor(seconds), START);

export const clock = (seconds: number): string => {
  const total = whole(seconds);
  const minutes = Math.floor(total / SECONDS_PER_MINUTE);
  return `${minutes}:${Str.padStart(CLOCK_DIGITS, "0")(String(total % SECONDS_PER_MINUTE))}`;
};

export const preciseClock = (seconds: number): string => {
  const tenths = Math.floor(Math.max(seconds, START) * TENTHS) % TENTHS;
  return `${clock(seconds)}.${Str.padStart(TENTH_DIGITS, "0")(String(tenths))}`;
};
