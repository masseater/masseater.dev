import { DateTime, Option, Order, String as Str, pipe } from "effect";

import type { PeriodInputValue, PeriodValue } from "./money";

const MONTHS_BEFORE = 11;

const START = 0;

const MONTH_LENGTH = 7;

const JST = { hours: 9 } as const;

const MONTH_START = "-01T00:00:00Z";

const earlier = Order.min(Str.Order);

const monthOf = Str.slice(START, MONTH_LENGTH);

export const todayJst = (now: DateTime.Utc): string =>
  pipe(now, DateTime.add(JST), DateTime.formatIsoDateUtc);

const monthStart = (month: string): Option.Option<DateTime.Utc> =>
  DateTime.make(`${month}${MONTH_START}`);

const firstShown = (month: string): string =>
  pipe(
    monthStart(month),
    Option.map((time) =>
      pipe(time, DateTime.subtract({ months: MONTHS_BEFORE }), DateTime.formatIsoDateUtc, monthOf),
    ),
    Option.getOrElse(() => month),
  );

const lastDayOf = (month: string): string =>
  pipe(
    monthStart(month),
    Option.map((time) => pipe(time, DateTime.endOf("month"), DateTime.formatIsoDateUtc)),
    Option.getOrElse(() => month),
  );

export const periodOf = ({
  input,
  today,
}: Readonly<{ input: PeriodInputValue; today: string }>): PeriodValue => {
  const to = input.to ?? monthOf(today);
  const from = input.from ?? firstShown(to);
  return { from: earlier(from, to), to };
};

export const asOfOf = ({
  period,
  today,
}: Readonly<{ period: PeriodValue; today: string }>): string =>
  earlier(lastDayOf(period.to), today);
