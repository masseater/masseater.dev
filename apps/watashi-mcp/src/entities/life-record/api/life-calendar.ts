import { Array as Arr, DateTime, Option, String as Str, pipe } from "effect";

export type Period = Readonly<{ from: string; to: string }>;

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

const MONDAY = 1;

const ONE_DAY = 1;

const MONTH_LENGTH = 7;

const MIDNIGHT = "T00:00:00Z";

const MAX_DAYS = 3660;

const FIRST_OFFSET = 0;

const dayTime = (day: string): Option.Option<DateTime.Utc> => DateTime.make(`${day}${MIDNIGHT}`);

export const shiftDays =
  (days: number) =>
  (day: string): string =>
    pipe(
      dayTime(day),
      Option.map((time) => pipe(time, DateTime.add({ days }), DateTime.formatIsoDateUtc)),
      Option.getOrElse(() => day),
    );

const shiftYears =
  (years: number) =>
  (day: string): string =>
    pipe(
      dayTime(day),
      Option.map((time) => pipe(time, DateTime.add({ years }), DateTime.formatIsoDateUtc)),
      Option.getOrElse(() => day),
    );

export const daysBetween = ({ from, to }: Period): readonly string[] =>
  pipe(
    Arr.range(FIRST_OFFSET, MAX_DAYS),
    Arr.map((offset) => shiftDays(offset)(from)),
    Arr.takeWhile((day) => day <= to),
  );

export const weekStartOf = (day: string): string =>
  pipe(
    dayTime(day),
    Option.map((time) =>
      pipe(time, DateTime.startOf("week", { weekStartsOn: MONDAY }), DateTime.formatIsoDateUtc),
    ),
    Option.getOrElse(() => day),
  );

export const monthOf = (day: string): string => pipe(day, Str.takeLeft(MONTH_LENGTH));

export const weekdayOf = (day: string): Weekday =>
  pipe(
    dayTime(day),
    Option.flatMap((time) => Arr.get(WEEKDAYS, DateTime.getPartUtc(time, "weekDay"))),
    Option.getOrElse((): Weekday => "sun"),
  );

export const previousPeriod = ({ from, to }: Period): Period => {
  const length = Arr.length(daysBetween({ from, to }));
  return { from: shiftDays(-length)(from), to: shiftDays(-ONE_DAY)(from) };
};

export const previousYear = ({ from, to }: Period): Period => ({
  from: shiftYears(-ONE_DAY)(from),
  to: shiftYears(-ONE_DAY)(to),
});
