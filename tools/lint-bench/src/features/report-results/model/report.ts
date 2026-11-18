import {
  Array as Arr,
  Function as Fn,
  Match,
  Number as Num,
  Option,
  Order,
  Record as Rec,
  pipe,
} from "effect";

import type { Family, Measurement } from "#/entities/bench/index.ts";
import { table } from "#/shared/lib/markdown.ts";
import type { Cells } from "#/shared/lib/markdown.ts";

export type Overlap = Readonly<{ shared: number; onlyOwn: number; onlyThis: number }>;

export type Row = Omit<Measurement, "found"> & Readonly<{ overlap?: Overlap }>;

const NONE = 0;

const countsOf = (keys: readonly string[]): Readonly<Record<string, number>> =>
  Rec.map(Arr.groupBy(keys, Fn.identity), (group) => group.length);

export const overlapOf = ({
  own,
  other,
}: Readonly<{ own: readonly string[]; other: readonly string[] }>): Overlap => {
  const theirs = countsOf(other);
  const shared = pipe(
    Rec.toEntries(countsOf(own)),
    Arr.map(([key, count]) =>
      Math.min(
        count,
        Option.getOrElse(Rec.get(theirs, key), () => NONE),
      ),
    ),
    Num.sumAll,
  );
  return { shared, onlyOwn: own.length - shared, onlyThis: other.length - shared };
};

const sameGroup =
  (measurement: Measurement) =>
  (other: Measurement): boolean =>
    other.own &&
    other.family === measurement.family &&
    other.corpus === measurement.corpus &&
    other.keys === measurement.keys;

const rowOf =
  (measurements: readonly Measurement[]) =>
  ({ found, ...measurement }: Measurement): Row =>
    pipe(
      Option.fromNullishOr(measurement.keys),
      Option.flatMap(() => pipe(measurements, Arr.findFirst(sameGroup({ found, ...measurement })))),
      Option.filter((own) => !measurement.own && own !== measurement),
      Option.match({
        onNone: (): Row => measurement,
        onSome: (own): Row => ({
          ...measurement,
          overlap: overlapOf({ own: own.found, other: found }),
        }),
      }),
    );

export const rowsOf = (measurements: readonly Measurement[]): readonly Row[] =>
  pipe(measurements, Arr.map(rowOf(measurements)));

const MILLIS = 1000;

const DECIMALS = 2;

const timeOf = (millis: number): string =>
  Match.value(millis).pipe(
    Match.when(
      Num.isGreaterThanOrEqualTo(MILLIS),
      () => `${(millis / MILLIS).toFixed(DECIMALS)} s`,
    ),
    Match.orElse(() => `${Math.round(millis)} ms`),
  );

const toolOf = (row: Row): string =>
  Match.value(row.own).pipe(
    Match.when(true, () => `**${row.tool}**`),
    Match.orElse(() => row.tool),
  );

const overlapCell =
  (row: Row) =>
  (field: keyof Overlap): number | string =>
    pipe(
      Option.fromNullishOr(row.overlap),
      Option.map((overlap) => overlap[field]),
      Option.getOrElse(() => ""),
    );

const COLUMNS = [
  "Tool",
  "Version",
  "Cold",
  "Warm",
  "Peak RSS",
  "Findings",
  "Same as ours",
  "Only ours",
  "Only theirs",
];

const cellsOf = (row: Row): Cells => ({
  Tool: toolOf(row),
  Version: row.version,
  Cold: timeOf(row.cold.mean),
  Warm: `${timeOf(row.warm.mean)} ± ${timeOf(row.warm.stddev)}`,
  "Peak RSS": `${Math.round(row.peakRssMegabytes)} MB`,
  Findings: row.findings,
  "Same as ours": overlapCell(row)("shared"),
  "Only ours": overlapCell(row)("onlyOwn"),
  "Only theirs": overlapCell(row)("onlyThis"),
});

const scopesOf = (group: readonly Row[]): string =>
  pipe(
    group,
    Arr.map((row) => `- ${row.tool}: ${row.scope}`),
    Arr.join("\n"),
  );

const corpusSection = (corpus: string, group: readonly Row[]): string =>
  `### ${corpus}\n\n${table(COLUMNS)(
    pipe(
      group,
      Arr.sortWith((row) => row.warm.mean, Order.Number),
      Arr.map(cellsOf),
    ),
  )}\n\n${scopesOf(group)}`;

export const sectionOf =
  (rows: readonly Row[]) =>
  (family: Family): string =>
    pipe(
      rows,
      Arr.filter((row) => row.family === family),
      Arr.groupBy((row): string => row.corpus),
      Rec.toEntries,
      Arr.map(([corpus, group]) => corpusSection(corpus, group)),
      Arr.join("\n\n"),
    );
