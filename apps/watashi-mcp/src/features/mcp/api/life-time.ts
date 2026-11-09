import { DateTime, Effect, Option, Result, String as Str, pipe } from "effect";

const PRECISIONS = ["day", "month", "year"] as const;

type Precision = (typeof PRECISIONS)[number];

type TimeValue =
  | Readonly<{ kind: "instant"; utc: string; assumedZone: boolean }>
  | Readonly<{ kind: "date"; date: string; precision: Precision }>;

type TimeOut =
  | Readonly<{ utc: string; jst: string }>
  | Readonly<{ date: string; precision: Precision }>;

type DayRange = Readonly<{ start: string; end: string }>;

const MILLIS_PER_HOUR = 3_600_000;

const JST_HOURS = 9;

const JST_OFFSET = JST_HOURS * MILLIS_PER_HOUR;

const JST_SUFFIX = "+09:00";

const YEAR = /^\d{4}$/u;

const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;

const DAY = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?$/u;

const LAST_MONTH = "12";

const FIRST_DAY = "01";

const LAST_DAY = "31";

const MINUTES_END = 16;

const DATE_LENGTH = 10;

const TIME_FORMAT =
  "Use ISO 8601: 2026-11-08T19:00+09:00, 2026-11-08T10:00Z, 2026-11-08, 2024-03 or 2010.";

const parseInstant = (input: string, assumedZone: boolean): Result.Result<TimeValue, string> =>
  pipe(
    DateTime.make(input),
    Option.match({
      onNone: () => Result.fail(`"${input}" is not a valid time. ${TIME_FORMAT}`),
      onSome: (time) =>
        Result.succeed({ kind: "instant" as const, utc: DateTime.formatIso(time), assumedZone }),
    }),
  );

const ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/u;

const hasZone = (input: string): boolean => ZONE.test(input);

const precisionOf = (date: string): Precision => {
  if (YEAR.test(date)) {
    return "year";
  }
  if (MONTH.test(date)) {
    return "month";
  }
  return "day";
};

const isDate = (input: string): boolean => YEAR.test(input) || MONTH.test(input) || DAY.test(input);

const parseTime = (input: string): Result.Result<TimeValue, string> => {
  if (isDate(input)) {
    return Result.succeed({ kind: "date", date: input, precision: precisionOf(input) });
  }
  if (!INSTANT.test(input)) {
    return Result.fail(`"${input}" is not a valid time. ${TIME_FORMAT}`);
  }
  if (hasZone(input)) {
    return parseInstant(input, false);
  }
  return parseInstant(`${input}${JST_SUFFIX}`, true);
};

const storedOf = (value: TimeValue): string => {
  if (value.kind === "instant") {
    return value.utc;
  }
  return value.date;
};

const inJst = (utc: string): Option.Option<DateTime.Zoned> =>
  pipe(
    DateTime.make(utc),
    Option.map((time) => DateTime.setZoneOffset(time, JST_OFFSET)),
  );

const jstIso = (utc: string): string =>
  pipe(
    inJst(utc),
    Option.map((zoned) =>
      Str.concat(JST_SUFFIX)(pipe(DateTime.formatIsoOffset(zoned), Str.takeLeft(MINUTES_END))),
    ),
    Option.getOrElse(() => utc),
  );

const jstDayOf = (utc: string): string =>
  pipe(
    inJst(utc),
    Option.map(DateTime.formatIsoDate),
    Option.getOrElse(() => pipe(utc, Str.takeLeft(DATE_LENGTH))),
  );

const isInstant = (stored: string): boolean => pipe(stored, Str.includes("T"));

const timeOut = (stored: string): TimeOut => {
  if (isInstant(stored)) {
    return { utc: stored, jst: jstIso(stored) };
  }
  return { date: stored, precision: precisionOf(stored) };
};

const lastDayOfMonth = (month: string): string =>
  pipe(
    DateTime.make(`${month}-${FIRST_DAY}T00:00:00Z`),
    Option.map((start) =>
      pipe(
        start,
        DateTime.add({ months: 1 }),
        DateTime.add({ days: -1 }),
        DateTime.formatIsoDateUtc,
      ),
    ),
    Option.getOrElse(() => `${month}-${LAST_DAY}`),
  );

const dayRangeOf = (stored: string): DayRange => {
  if (isInstant(stored)) {
    const day = jstDayOf(stored);
    return { start: day, end: day };
  }
  const precision = precisionOf(stored);
  if (precision === "year") {
    return {
      start: `${stored}-${FIRST_DAY}-${FIRST_DAY}`,
      end: `${stored}-${LAST_MONTH}-${LAST_DAY}`,
    };
  }
  if (precision === "month") {
    return { start: `${stored}-${FIRST_DAY}`, end: lastDayOfMonth(stored) };
  }
  return { start: stored, end: stored };
};

const todayJst: Effect.Effect<string> = DateTime.now.pipe(
  Effect.map((now) => jstDayOf(DateTime.formatIso(now))),
);

const dayBound =
  (edge: keyof DayRange) =>
  (input: string | undefined): Option.Option<string> =>
    pipe(
      Option.fromUndefinedOr(input),
      Option.flatMap((text) => Result.getSuccess(parseTime(text))),
      Option.map((time) => dayRangeOf(storedOf(time))[edge]),
    );

const isDayPrecise = (stored: string): boolean =>
  isInstant(stored) || precisionOf(stored) === "day";

export { dayBound, dayRangeOf, isDayPrecise, jstDayOf, parseTime, storedOf, timeOut, todayJst };
export type { DayRange, Precision, TimeOut, TimeValue };
