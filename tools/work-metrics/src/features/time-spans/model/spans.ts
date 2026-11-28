import {
  Array as Arr,
  Number as Num,
  Option,
  Order,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import { table } from "#/shared/lib/markdown.ts";
import { MAXIMUM, MEDIAN, TAIL, percentile } from "#/shared/lib/stats.ts";

export type TimedSpan = Readonly<{
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Readonly<Record<string, unknown>>;
}>;

export type SpanCost = Readonly<{
  kind: string;
  name: string;
  runs: number;
  totalSeconds: number;
  p50Seconds: number;
  p90Seconds: number;
  maxSeconds: number;
}>;

const NANOS_PER_SECOND = 1_000_000_000;
const DIGITS = 1;
const NOTHING = 0;
const SEPARATOR = "\u0000";
const QUEUED_SUFFIX = " (queued)";
const NAME_LIMIT = 80;
const COMMIT = /@[0-9a-f]{7,40}/gu;
const SPACES = /\s+/gu;

const has =
  (key: string) =>
  (span: TimedSpan): boolean =>
    key in span.attributes;

const KINDS: readonly (readonly [string, (span: TimedSpan) => boolean])[] = [
  ["task", has("vp.task.command")],
  ["action", has("github.action.id")],
  ["step", has("github.step.conclusion")],
  ["queued", (span: TimedSpan): boolean => Str.endsWith(QUEUED_SUFFIX)(span.name)],
  ["job", has("cicd.pipeline.task.run.id")],
  ["pipeline", has("cicd.pipeline.result")],
];

const OTHER = "span";

const kindOf = (span: TimedSpan): string =>
  pipe(
    KINDS,
    Arr.findFirst(([, matches]) => matches(span)),
    Option.map(([kind]) => kind),
    Option.getOrElse(() => OTHER),
  );

const nameOf = (span: TimedSpan): string =>
  pipe(
    span.name,
    Str.replaceAll(COMMIT, "@"),
    Str.replaceAll(SPACES, " "),
    Str.slice(NOTHING, NAME_LIMIT),
  );

const secondsOf = (span: TimedSpan): number =>
  Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / NANOS_PER_SECOND;

const at =
  (rank: number) =>
  (values: readonly number[]): number =>
    Option.getOrElse(percentile(rank)(values), () => NOTHING);

const round = (value: number): number => Number(value.toFixed(DIGITS));

const costOf =
  (kind: string, name: string) =>
  (seconds: readonly number[]): SpanCost => ({
    kind,
    name,
    runs: seconds.length,
    totalSeconds: round(Num.sumAll(seconds)),
    p50Seconds: round(at(MEDIAN)(seconds)),
    p90Seconds: round(at(TAIL)(seconds)),
    maxSeconds: round(at(MAXIMUM)(seconds)),
  });

const byTotal = Order.flip(Order.mapInput(Num.Order, (cost: SpanCost) => cost.totalSeconds));

export const spanCosts = (spans: readonly TimedSpan[]): readonly SpanCost[] =>
  Arr.sort(
    pipe(
      spans,
      Arr.map((span) => ({ kind: kindOf(span), name: nameOf(span), seconds: secondsOf(span) })),
      Arr.groupBy((entry) => `${entry.kind}${SEPARATOR}${entry.name}`),
      Rec.values,
      Arr.map((entries) => {
        const [first] = entries;
        return costOf(
          first.kind,
          first.name,
        )(
          pipe(
            entries,
            Arr.map((entry) => entry.seconds),
          ),
        );
      }),
    ),
    byTotal,
  );

const COLUMNS = ["name", "runs", "totalSeconds", "p50Seconds", "p90Seconds", "maxSeconds"];

const sectionOf =
  (top: number) =>
  ([kind, costs]: readonly [string, readonly SpanCost[]]): string =>
    `### ${kind}\n\n${table(COLUMNS)(Arr.take(costs, top))}`;

export const spanSummary =
  (top: number) =>
  (costs: readonly SpanCost[]): string =>
    pipe(
      costs,
      Arr.groupBy((cost) => cost.kind),
      Rec.toEntries,
      Arr.map(sectionOf(top)),
      Arr.join("\n\n"),
    );
