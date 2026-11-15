import { DateTime, Option, pipe } from "effect";

const WEEK = { days: 6 } as const;

const PREVIOUS = { days: 7 } as const;

const shift = ({ day, by }: Readonly<{ day: string; by: Readonly<{ days: number }> }>): string =>
  pipe(
    DateTime.make(`${day}T00:00:00Z`),
    Option.map((time) => pipe(time, DateTime.subtract(by), DateTime.formatIsoDateUtc)),
    Option.getOrElse(() => day),
  );

export const weekStart = (today: string): string => shift({ day: today, by: WEEK });

export const previousWeekStart = (today: string): string =>
  shift({ day: weekStart(today), by: PREVIOUS });
