import { DateTime, Option, pipe } from "effect";

const DAY = /^\d{4}-\d{2}-\d{2}$/u;

export const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;

export const isCalendarDay = (text: string): boolean =>
  DAY.test(text) &&
  pipe(
    DateTime.make(`${text}T00:00:00Z`),
    Option.exists((time) => DateTime.formatIsoDateUtc(time) === text),
  );
