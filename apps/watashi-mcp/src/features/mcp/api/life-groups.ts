import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Aggregate } from "#/features/mcp/model/life-body";

import { monthOf, weekStartOf, weekdayOf } from "./life-calendar";
import { DEFAULT_AGGREGATE, aggregateFor, dailyOf, parseSpec, summarize } from "./life-daily";
import type { Daily, MetricSpec, StatEvent, Summary } from "./life-daily";

type Bins = Readonly<{ metric: string; bins: readonly number[] }>;

type GroupBy = Bins | Readonly<{ by: "weekday" | "kind" }> | Readonly<{ has: string }>;

const BUCKETS = ["day", "week", "month", "none"] as const;

type Bucket = (typeof BUCKETS)[number];

type StatsData = Readonly<{
  events: readonly StatEvent[];
  aggregates: Readonly<Record<string, Aggregate>>;
}>;

type BucketValue = Readonly<{ bucket: string; value?: number; daysLogged: number }>;

type GroupValue = Readonly<{ group: string }> & Summary;

type Measured = Readonly<{
  spec: MetricSpec;
  aggregate: Aggregate;
  data: StatsData;
  daily: Daily;
}>;

type DayGroup = readonly [string, readonly string[]];

type Bin = readonly [number, number];

const ZERO = 0;

const ONE = 1;

const dailyFor =
  (data: StatsData) =>
  (spec: MetricSpec): Daily =>
    dailyOf({ spec, aggregate: aggregateFor(data.aggregates)(spec), events: data.events });

const dailyOfMetric =
  (data: StatsData) =>
  (metric: string): Daily =>
    dailyFor(data)(parseSpec(metric));

const optional =
  <Key extends string>(key: Key) =>
  <Value>(value: Option.Option<Value>): Partial<Record<Key, Value>> =>
    Option.match(value, { onNone: () => ({}), onSome: (present) => Rec.singleton(key, present) });

const bucketKey =
  (bucket: Bucket) =>
  (day: string): string => {
    if (bucket === "week") {
      return weekStartOf(day);
    }
    if (bucket === "month") {
      return monthOf(day);
    }
    return day;
  };

const weekdayKey = (day: string): string => weekdayOf(day);

const groupValue =
  (measured: Measured) =>
  ([group, groupDays]: DayGroup): GroupValue => ({
    group,
    ...summarize(measured)(groupDays),
  });

const compactBucket = (group: GroupValue): BucketValue => ({
  bucket: group.group,
  ...optional("value")(Option.fromUndefinedOr(group.value)),
  daysLogged: group.daysLogged,
});

type Scope = Readonly<{ measured: Measured; days: readonly string[] }>;

const bucketsOf =
  ({ measured, days }: Scope) =>
  (bucket: Bucket): readonly BucketValue[] =>
    pipe(
      days,
      Arr.groupBy(bucketKey(bucket)),
      Rec.toEntries,
      Arr.sortWith(([key]: DayGroup) => key, Str.Order),
      Arr.map(groupValue(measured)),
      Arr.map(compactBucket),
    );

const binsOf = (bins: readonly number[]): readonly Bin[] => {
  const highs = pipe(bins, Arr.drop(ONE));
  return pipe(bins, Arr.zip(highs));
};

const inBin =
  (daily: Daily, [low, high]: Bin) =>
  (day: string): boolean =>
    pipe(
      Rec.get(daily, day),
      Option.exists((value) => value >= low && value < high),
    );

const binLabel = ([low, high]: Bin): string => `${low}-${high}`;

const binGroup =
  (daily: Daily, days: readonly string[]) =>
  (bin: Bin): DayGroup => [binLabel(bin), pipe(days, Arr.filter(inBin(daily, bin)))];

const groupsByBins = (
  measured: Measured,
  by: Bins,
  days: readonly string[],
): readonly DayGroup[] => {
  const daily = dailyOfMetric(measured.data)(by.metric);
  return pipe(binsOf(by.bins), Arr.map(binGroup(daily, days)));
};

const groupsByHas = (
  measured: Measured,
  target: string,
  days: readonly string[],
): readonly DayGroup[] => {
  const present = dailyOf({
    spec: { type: "days", target },
    aggregate: DEFAULT_AGGREGATE,
    events: measured.data.events,
  });
  const isPresent = (day: string): boolean => Rec.has(present, day);
  return [
    [`with:${target}`, pipe(days, Arr.filter(isPresent))],
    [
      `without:${target}`,
      pipe(
        days,
        Arr.filter((day) => !isPresent(day)),
      ),
    ],
  ];
};

const kindGroup =
  (measured: Measured, days: readonly string[]) =>
  ([kind, events]: readonly [string, readonly StatEvent[]]): GroupValue => {
    const daily = dailyOf({ ...measured, events });
    return groupValue({ ...measured, daily })([kind, days]);
  };

const kindGroups = (measured: Measured, days: readonly string[]): readonly GroupValue[] =>
  pipe(
    measured.data.events,
    Arr.groupBy((event: StatEvent) => event.kind),
    Rec.toEntries,
    Arr.map(kindGroup(measured, days)),
    Arr.filter((group) => group.daysLogged > ZERO),
    Arr.sortWith((group: GroupValue) => group.group, Str.Order),
  );

const groupsOf =
  ({ measured, days }: Scope) =>
  (groupBy: GroupBy): readonly GroupValue[] => {
    if ("bins" in groupBy) {
      return pipe(groupsByBins(measured, groupBy, days), Arr.map(groupValue(measured)));
    }
    if ("has" in groupBy) {
      return pipe(groupsByHas(measured, groupBy.has, days), Arr.map(groupValue(measured)));
    }
    if (groupBy.by === "kind") {
      return kindGroups(measured, days);
    }
    return pipe(days, Arr.groupBy(weekdayKey), Rec.toEntries, Arr.map(groupValue(measured)));
  };

export { BUCKETS, bucketsOf, dailyFor, dailyOfMetric, groupsOf, optional };
export type { Bins, Bucket, BucketValue, GroupBy, GroupValue, Measured, Scope, StatsData };
