import {
  Array as Arr,
  Number as Num,
  Option,
  Predicate,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import type { Aggregate } from "#/features/mcp/model/life-body";

type StatEvent = Readonly<{
  kind: string;
  day: string;
  values: Readonly<Record<string, unknown>>;
}>;

type MetricSpec =
  | Readonly<{ type: "metric"; metric: string }>
  | Readonly<{ type: "count"; kind: string }>
  | Readonly<{ type: "days"; target: string }>;

type Daily = Readonly<Record<string, number>>;

type Summary = Readonly<{
  value?: number;
  total: number;
  perLoggedDay?: number;
  perCalendarDay?: number;
  min?: number;
  max?: number;
  daysLogged: number;
}>;

type DailyInput = Readonly<{
  spec: MetricSpec;
  aggregate: Aggregate;
  events: readonly StatEvent[];
}>;

const COUNT_PREFIX = "count:";

const DAYS_PREFIX = "days:";

const ZERO = 0;

const PRESENT = 1;

const DEFAULT_AGGREGATE: Aggregate = "sum";

const parseSpec = (spec: string): MetricSpec => {
  if (pipe(spec, Str.startsWith(COUNT_PREFIX))) {
    return { type: "count", kind: pipe(spec, Str.slice(Str.length(COUNT_PREFIX))) };
  }
  if (pipe(spec, Str.startsWith(DAYS_PREFIX))) {
    return { type: "days", target: pipe(spec, Str.slice(Str.length(DAYS_PREFIX))) };
  }
  return { type: "metric", metric: spec };
};

const aggregateFor =
  (aggregates: Readonly<Record<string, Aggregate>>) =>
  (spec: MetricSpec): Aggregate => {
    if (spec.type === "metric") {
      return pipe(
        Rec.get(aggregates, spec.metric),
        Option.getOrElse(() => DEFAULT_AGGREGATE),
      );
    }
    return DEFAULT_AGGREGATE;
  };

const numberIn =
  (metric: string) =>
  (event: StatEvent): Option.Option<number> =>
    pipe(
      Rec.get(event.values, metric),
      Option.filter(Predicate.isNumber),
      Option.filter(Number.isFinite),
    );

const combineNonEmpty = (
  aggregate: Aggregate,
  values: Arr.NonEmptyReadonlyArray<number>,
): number => {
  if (aggregate === "avg") {
    return Num.sumAll(values) / Arr.length(values);
  }
  if (aggregate === "last") {
    return Arr.lastNonEmpty(values);
  }
  if (aggregate === "max") {
    return Arr.max(values, Num.Order);
  }
  if (aggregate === "min") {
    return Arr.min(values, Num.Order);
  }
  return Num.sumAll(values);
};

const combine = (aggregate: Aggregate, values: readonly number[]): Option.Option<number> =>
  pipe(
    Option.liftPredicate(values, Arr.isReadonlyArrayNonEmpty),
    Option.map((nonEmpty) => combineNonEmpty(aggregate, nonEmpty)),
  );

const hasTarget =
  (target: string) =>
  (event: StatEvent): boolean =>
    event.kind === target ||
    pipe(
      numberIn(target)(event),
      Option.exists((value) => value > ZERO),
    );

const dayValue =
  ({ spec, aggregate }: Omit<DailyInput, "events">) =>
  (dayEvents: readonly StatEvent[]): Option.Option<number> => {
    if (spec.type === "count") {
      const matching = pipe(
        dayEvents,
        Arr.filter((event: StatEvent) => event.kind === spec.kind),
      );
      return Option.liftPredicate(Arr.length(matching), (count) => count > ZERO);
    }
    if (spec.type === "days") {
      return Option.liftPredicate(PRESENT, () => pipe(dayEvents, Arr.some(hasTarget(spec.target))));
    }
    const toNumber = numberIn(spec.metric);
    return combine(aggregate, pipe(dayEvents, Arr.map(toNumber), Arr.getSomes));
  };

const dailyOf = ({ events, ...input }: DailyInput): Daily =>
  pipe(
    events,
    Arr.groupBy((event) => event.day),
    Rec.map(dayValue(input)),
    Rec.getSomes,
  );

const valuesOn = (daily: Daily, days: readonly string[]): readonly number[] =>
  pipe(
    days,
    Arr.map((day) => Rec.get(daily, day)),
    Arr.getSomes,
  );

const ratio = (total: number, count: number): Option.Option<number> =>
  pipe(
    Option.liftPredicate(count, (value) => value > ZERO),
    Option.map((positive) => total / positive),
  );

const field = <Key extends string>(
  key: Key,
  value: Option.Option<number>,
): Partial<Record<Key, number>> =>
  Option.match(value, {
    onNone: () => ({}),
    onSome: (present) => Rec.singleton(key, present),
  });

const summarize =
  ({ aggregate, daily }: Readonly<{ aggregate: Aggregate; daily: Daily }>) =>
  (days: readonly string[]): Summary => {
    const values = valuesOn(daily, days);
    const total = Num.sumAll(values);
    const daysLogged = Arr.length(values);
    return {
      ...field("value", combine(aggregate, values)),
      total,
      ...field("perLoggedDay", ratio(total, daysLogged)),
      ...field("perCalendarDay", ratio(total, Arr.length(days))),
      ...field("min", combine("min", values)),
      ...field("max", combine("max", values)),
      daysLogged,
    };
  };

export { DEFAULT_AGGREGATE, aggregateFor, dailyOf, parseSpec, summarize };
export type { Daily, DailyInput, MetricSpec, StatEvent, Summary };
