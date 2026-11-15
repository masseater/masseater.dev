import { Array as Arr, DateTime, Option, Order, String as Str, pipe } from "effect";

import type { PeriodValue, RankingSearch } from "./search";

interface Window {
  readonly start: string;
  readonly end: string;
}

type Input = Readonly<{ search: RankingSearch; dates: readonly string[] }>;

const DATE_START = 0;
const DATE_LENGTH = 10;
const ONE = 1;
const SEVEN = 7;
const THIRTY = 30;

const isoDate = (time: DateTime.Utc): string =>
  pipe(time, DateTime.formatIso, Str.slice(DATE_START, DATE_LENGTH));

const daysBefore = ({
  date,
  days,
}: Readonly<{ date: string; days: number }>): Option.Option<string> =>
  pipe(
    DateTime.make(date),
    Option.map((time) => isoDate(DateTime.subtract(time, { days }))),
  );

const latest = (dates: readonly string[]): Option.Option<string> =>
  Arr.match(dates, {
    onEmpty: () => Option.none(),
    onNonEmpty: (all) => Option.some(Arr.max(all, Order.String)),
  });

const preset =
  (days: number) =>
  ({ dates }: Input): Option.Option<Window> =>
    pipe(
      latest(dates),
      Option.flatMap((end) =>
        pipe(
          daysBefore({ date: end, days }),
          Option.map((start) => ({ start, end })),
        ),
      ),
    );

const earliest = (dates: readonly string[]): Option.Option<string> =>
  Arr.match(dates, {
    onEmpty: () => Option.none(),
    onNonEmpty: (all) => Option.some(Arr.min(all, Order.String)),
  });

const orElse = (chosen: string, fallback: Option.Option<string>): string =>
  pipe(
    Option.liftPredicate(chosen, Str.isNonEmpty),
    Option.orElse(() => fallback),
    Option.getOrElse(() => chosen),
  );

const customRange = ({ search, dates }: Input): Window => ({
  start: orElse(search.from, earliest(dates)),
  end: orElse(search.to, latest(dates)),
});

const custom = (input: Input): Option.Option<Window> =>
  Option.liftPredicate(customRange(input), ({ start, end }) =>
    Order.isLessThan(Order.String)(start, end),
  );

const PERIODS: Readonly<Record<PeriodValue, (input: Input) => Option.Option<Window>>> = {
  all: () => Option.none(),
  "1": preset(ONE),
  "7": preset(SEVEN),
  "30": preset(THIRTY),
  custom,
};

const windowOf = (input: Input): Option.Option<Window> => PERIODS[input.search.period](input);

const covers = ({
  window,
  dates,
}: Readonly<{ window: Window; dates: readonly string[] }>): boolean =>
  Arr.contains(dates, window.start) && Arr.contains(dates, window.end);

export type { Window };
export { covers, customRange, windowOf };
