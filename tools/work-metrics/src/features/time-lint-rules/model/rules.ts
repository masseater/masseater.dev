import {
  Array as Arr,
  Number as Num,
  Option,
  Order,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { table } from "#/shared/lib/markdown.ts";
import { MAXIMUM, MEDIAN, TAIL, percentile } from "#/shared/lib/stats.ts";

export type RuleSpan = Readonly<{
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Readonly<Record<string, unknown>>;
}>;

export type MetricSeries = Readonly<{ name: string; dataPoints: readonly unknown[] }>;

export type RuleCost = Readonly<{
  linter: string;
  rule: string;
  runs: number;
  totalMillis: number;
  p50Millis: number;
  p90Millis: number;
  maxMillis: number;
  diagnostics: number;
}>;

type Run = Readonly<{ linter: string; rule: string; millis: number }>;

const RULE_SUFFIX = ".rule";
const DIAGNOSTICS = "lint.diagnostics";
const NANOS_PER_MILLI = 1_000_000;
const DIGITS = 3;
const NOTHING = 0;
const SEPARATOR = "\u0000";

const DataPoint = Schema.Struct({
  attributes: Schema.Record(Schema.String, Schema.Unknown),
  startTimeUnixNano: Schema.optionalKey(Schema.String),
  asInt: Schema.optionalKey(Schema.Union([Schema.String, Schema.Finite])),
});
type Point = typeof DataPoint.Type;

const decodePoint = Schema.decodeUnknownOption(DataPoint);

const millisOf = (span: RuleSpan): number =>
  Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / NANOS_PER_MILLI;

const linterOf = (name: string): Option.Option<string> =>
  pipe(
    Option.liftPredicate(name, Str.endsWith(RULE_SUFFIX)),
    Option.map(Str.slice(NOTHING, -RULE_SUFFIX.length)),
  );

const runOf = (span: RuleSpan): Option.Option<Run> =>
  Option.all({
    linter: linterOf(span.name),
    rule: Option.fromNullishOr(span.attributes[`${span.name}.id`]).pipe(Option.map(String)),
  }).pipe(Option.map(({ linter, rule }) => ({ linter, rule, millis: millisOf(span) })));

const attributeOf =
  (key: string) =>
  (point: Point): string =>
    String(point.attributes[key]);

const seriesKeyOf = (point: Point): string =>
  Arr.join(
    [
      point.startTimeUnixNano ?? "",
      attributeOf("lint.check")(point),
      attributeOf("lint.rule")(point),
    ],
    SEPARATOR,
  );

const countOf = (point: Point): number => Number(point.asInt ?? NOTHING);

const latestOf = (points: readonly Point[]): Readonly<{ rule: string; count: number }> => ({
  rule: pipe(
    Arr.head(points),
    Option.map(attributeOf("lint.rule")),
    Option.getOrElse(() => ""),
  ),
  count: Math.max(NOTHING, ...pipe(points, Arr.map(countOf))),
});

const sumCounts = (entries: readonly Readonly<{ count: number }>[]): number =>
  pipe(
    entries,
    Arr.map((entry) => entry.count),
    Num.sumAll,
  );

const pointsOf = (metrics: readonly MetricSeries[]): readonly Point[] =>
  pipe(
    metrics,
    Arr.filter((metric) => metric.name === DIAGNOSTICS),
    Arr.flatMap((metric) => metric.dataPoints),
    Arr.map((point) => decodePoint(point)),
    Arr.getSomes,
  );

const diagnosticsByRule = (metrics: readonly MetricSeries[]): Readonly<Record<string, number>> =>
  pipe(
    pointsOf(metrics),
    Arr.groupBy(seriesKeyOf),
    Rec.values,
    Arr.map(latestOf),
    Arr.groupBy((entry) => entry.rule),
    Rec.map(sumCounts),
  );

const at =
  (rank: number) =>
  (values: readonly number[]): number =>
    Option.getOrElse(percentile(rank)(values), () => NOTHING);

const byTotal = Order.flip(Order.mapInput(Num.Order, (cost: RuleCost) => cost.totalMillis));

const costOf =
  (diagnostics: Readonly<Record<string, number>>) =>
  ([first, ...rest]: readonly [Run, ...Run[]]): RuleCost => {
    const millis = pipe(
      [first, ...rest],
      Arr.map((run) => run.millis),
    );
    return {
      linter: first.linter,
      rule: first.rule,
      runs: millis.length,
      totalMillis: Num.sumAll(millis),
      p50Millis: at(MEDIAN)(millis),
      p90Millis: at(TAIL)(millis),
      maxMillis: at(MAXIMUM)(millis),
      diagnostics: Option.getOrElse(Rec.get(diagnostics, first.rule), () => NOTHING),
    };
  };

const runKeyOf = (run: Run): string => Arr.join([run.linter, run.rule], SEPARATOR);

export const ruleCosts =
  (metrics: readonly MetricSeries[]) =>
  (spans: readonly RuleSpan[]): readonly RuleCost[] => {
    const costOfRuns = costOf(diagnosticsByRule(metrics));
    const costs = pipe(
      spans,
      Arr.map(runOf),
      Arr.getSomes,
      Arr.groupBy(runKeyOf),
      Rec.values,
      Arr.map(costOfRuns),
    );
    return Arr.sort(costs, byTotal);
  };

const COLUMNS = [
  "linter",
  "rule",
  "runs",
  "totalMillis",
  "p50Millis",
  "p90Millis",
  "maxMillis",
  "diagnostics",
];

const rowOf = (cost: RuleCost): Readonly<Record<string, string | number>> => ({
  ...cost,
  totalMillis: cost.totalMillis.toFixed(DIGITS),
  p50Millis: cost.p50Millis.toFixed(DIGITS),
  p90Millis: cost.p90Millis.toFixed(DIGITS),
  maxMillis: cost.maxMillis.toFixed(DIGITS),
});

export const ruleSummary = (costs: readonly RuleCost[]): string =>
  pipe(costs, Arr.map(rowOf), table(COLUMNS));
