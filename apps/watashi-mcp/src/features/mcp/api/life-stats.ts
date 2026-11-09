import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Aggregate } from "#/features/mcp/model/life-body";

import { daysBetween } from "./life-calendar";
import type { Period } from "./life-calendar";
import { aggregateFor, parseSpec, summarize } from "./life-daily";
import type { Daily, StatEvent, Summary } from "./life-daily";
import { bucketsOf, dailyFor, dailyOfMetric, groupsOf, optional } from "./life-groups";
import type { Bucket, BucketValue, GroupBy, GroupValue, Measured, StatsData } from "./life-groups";

type Condition = Readonly<{
  metric: string;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}>;

type StatsRequest = Readonly<{
  metrics: readonly string[];
  period: Period;
  bucket: Bucket;
  compare: Option.Option<Period>;
  where: readonly Condition[];
  groupBy: Option.Option<GroupBy>;
}>;

type MetricStats = Summary &
  Readonly<{
    metric: string;
    aggregate: Aggregate;
    daysWithAnyRecord: number;
    firstRecord?: string;
    buckets?: readonly BucketValue[];
    groups?: readonly GroupValue[];
    compare?: Summary & Period;
  }>;

type Check = Readonly<{ condition: Condition; daily: Daily }>;

type KeptDays = (period: Period) => readonly string[];

const boundHolds =
  (bound: number | undefined, value: number) =>
  (test: (left: number, right: number) => boolean): boolean =>
    pipe(
      Option.fromUndefinedOr(bound),
      Option.match({ onNone: () => true, onSome: (limit) => test(value, limit) }),
    );

const satisfies =
  (condition: Condition) =>
  (value: number): boolean =>
    boundHolds(condition.gt, value)((left, right) => left > right) &&
    boundHolds(condition.gte, value)((left, right) => left >= right) &&
    boundHolds(condition.lt, value)((left, right) => left < right) &&
    boundHolds(condition.lte, value)((left, right) => left <= right);

const checkOf =
  (data: StatsData) =>
  (condition: Condition): Check => ({
    condition,
    daily: dailyOfMetric(data)(condition.metric),
  });

const passes =
  (day: string) =>
  ({ condition, daily }: Check): boolean =>
    pipe(Rec.get(daily, day), Option.exists(satisfies(condition)));

const passesAll =
  (checks: readonly Check[]) =>
  (day: string): boolean =>
    pipe(checks, Arr.every(passes(day)));

const keptDaysOf =
  (data: StatsData) =>
  (where: readonly Condition[]): KeptDays => {
    const checks = pipe(where, Arr.map(checkOf(data)));
    return (period) => pipe(daysBetween(period), Arr.filter(passesAll(checks)));
  };

const anyRecordDays = (data: StatsData, days: readonly string[]): number => {
  const logged = pipe(
    data.events,
    Arr.groupBy((event: StatEvent) => event.day),
  );
  return pipe(
    days,
    Arr.filter((day) => Rec.has(logged, day)),
    Arr.length,
  );
};

const firstRecordOf = (daily: Daily): Option.Option<string> =>
  pipe(
    Rec.keys(daily),
    Arr.sortWith((day: string) => day, Str.Order),
    Arr.head,
  );

const nonEmpty = <Value>(values: readonly Value[]): Option.Option<readonly Value[]> =>
  Option.liftPredicate(values, Arr.isReadonlyArrayNonEmpty);

const bucketsOption = (
  bucket: Bucket,
  measured: Measured,
  days: readonly string[],
): Option.Option<readonly BucketValue[]> =>
  pipe(
    Option.liftPredicate(bucket, (value) => value !== "none"),
    Option.map(bucketsOf({ measured, days })),
    Option.flatMap(nonEmpty),
  );

const groupsOption = (
  groupBy: Option.Option<GroupBy>,
  measured: Measured,
  days: readonly string[],
): Option.Option<readonly GroupValue[]> => pipe(groupBy, Option.map(groupsOf({ measured, days })));

const compareOf =
  (measured: Measured, kept: KeptDays) =>
  (period: Period): Summary & Period => ({ ...period, ...summarize(measured)(kept(period)) });

const compareOption = (
  compare: Option.Option<Period>,
  measured: Measured,
  kept: KeptDays,
): Option.Option<Summary & Period> => pipe(compare, Option.map(compareOf(measured, kept)));

const measure =
  (data: StatsData) =>
  (metric: string): Measured => {
    const spec = parseSpec(metric);
    const aggregate = aggregateFor(data.aggregates)(spec);
    return { spec, aggregate, data, daily: dailyFor(data)(spec) };
  };

const statsOf =
  (request: StatsRequest, kept: KeptDays) =>
  (measured: Measured, metric: string): MetricStats => {
    const days = kept(request.period);
    return {
      metric,
      aggregate: measured.aggregate,
      ...summarize(measured)(days),
      daysWithAnyRecord: anyRecordDays(measured.data, days),
      ...optional("firstRecord")(firstRecordOf(measured.daily)),
      ...optional("buckets")(bucketsOption(request.bucket, measured, days)),
      ...optional("groups")(groupsOption(request.groupBy, measured, days)),
      ...optional("compare")(compareOption(request.compare, measured, kept)),
    };
  };

const computeStats =
  (request: StatsRequest) =>
  (data: StatsData): readonly MetricStats[] => {
    const stats = statsOf(request, keptDaysOf(data)(request.where));
    const measureOf = measure(data);
    return pipe(
      request.metrics,
      Arr.map((metric) => stats(measureOf(metric), metric)),
    );
  };

export { computeStats };
export type { Condition, MetricStats, StatsRequest };
export type { Bucket, GroupBy, StatsData } from "./life-groups";
