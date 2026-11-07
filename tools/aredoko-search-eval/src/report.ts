import { Array, Console, Effect, FileSystem, Number, Option, Record, Schema, pipe } from "effect";

import type { Scores } from "./metrics.ts";

const BASELINE_FILE = "fixtures/baseline.json";
const REPORT_DIRECTORY = "report";
const REPORT_FILE = `${REPORT_DIRECTORY}/latest.json`;
const PERCENT = 100;
const DIGITS = 1;
const ZERO = 0;
const INDENT = 2;

const QueryScore = Schema.Struct({
  query: Schema.String,
  rank: Schema.Int,
  top: Schema.Array(Schema.String),
});

const ScoresSchema = Schema.Struct({
  hitAt1: Schema.Finite,
  hitAt5: Schema.Finite,
  hitAt10: Schema.Finite,
  mrr: Schema.Finite,
  queries: Schema.Array(QueryScore),
});

const Report = Schema.Record(Schema.String, ScoresSchema);

const ReportJson = Schema.fromJsonString(Report);

type ReportValue = Readonly<Record<string, Scores>>;

const METRICS = ["hitAt1", "hitAt5", "hitAt10", "mrr"] as const;

type Metric = (typeof METRICS)[number];

interface Line {
  readonly condition: string;
  readonly metric: Metric;
  readonly now: Scores;
  readonly before: Option.Option<Scores>;
}

const percent = (value: number): string => (value * PERCENT).toFixed(DIGITS);

const signed = (value: number): string => {
  if (value > ZERO) {
    return `+${percent(value)}`;
  }
  return percent(value);
};

const lineOf = ({ condition, metric, now, before }: Line): string =>
  pipe(
    before,
    Option.match({
      onNone: () => `${condition}\t${metric}\t${percent(now[metric])}`,
      onSome: (previous) =>
        `${condition}\t${metric}\t${percent(previous[metric])} → ${percent(now[metric])} (${signed(Number.subtract(now[metric], previous[metric]))})`,
    }),
  );

const readBaseline = Effect.gen(function* readBaseline() {
  const fileSystem = yield* FileSystem.FileSystem;
  if (!(yield* fileSystem.exists(BASELINE_FILE))) {
    return Option.none<typeof Report.Type>();
  }
  const text = yield* fileSystem.readFileString(BASELINE_FILE);
  const report = yield* Schema.decodeEffect(ReportJson)(text);
  return Option.some(report);
});

const encodeReport = Schema.encodeEffect(Schema.fromJsonString(Report, { space: INDENT }));

/** @internal */
const writeReport = Effect.fn("writeReport")(function* writeReport(
  report: ReportValue,
  updateBaseline: boolean,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = `${yield* encodeReport(report)}\n`;
  yield* fileSystem.makeDirectory(REPORT_DIRECTORY, { recursive: true });
  yield* fileSystem.writeFileString(REPORT_FILE, text);
  if (updateBaseline) {
    yield* fileSystem.writeFileString(BASELINE_FILE, text);
  }
});

/** @internal */
const printComparison = Effect.fn("printComparison")(function* printComparison(
  report: ReportValue,
) {
  const baseline = yield* readBaseline;
  const lines = pipe(
    Record.toEntries(report),
    Array.flatMap(([condition, now]) =>
      pipe(
        METRICS,
        Array.map((metric) =>
          lineOf({
            condition,
            metric,
            now,
            before: pipe(
              baseline,
              Option.flatMap((previous) => Record.get(previous, condition)),
            ),
          }),
        ),
      ),
    ),
  );
  yield* Console.log(Array.join(lines, "\n"));
});

export { printComparison, writeReport };
export type { ReportValue };
