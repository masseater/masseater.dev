import type { EngineRun, JaBenchSummary } from "@ocr-decide/measurements/ja-bench-schema";
import { Array as Arr, pipe } from "effect";

import type { Column } from "#/shared/ui/value-table.ts";

import { COPY } from "./copy.ts";

const PERCENT = 100;

const COST_DIGITS = 5;

const SECOND_DIGITS = 2;

const NONE = 0;

/** @stability experimental */
export type EngineColumn = Column<EngineRun>;

/** @stability experimental */
export interface Table {
  readonly id: string;
  readonly title: string;
  readonly columns: readonly EngineColumn[];
}

const percent = (rate: number): string => `${Math.round(rate * PERCENT)}%`;

const OVERALL: Table = {
  id: "overall",
  title: COPY.overall,
  columns: [
    { id: "accuracy", label: COPY.accuracy, cell: (run) => percent(run.accuracy) },
    { id: "char-f1", label: COPY.charF1, cell: (run) => percent(run.charF1) },
    {
      id: "seconds",
      label: COPY.seconds,
      cell: (run) => `${run.secondsPerPage.toFixed(SECOND_DIGITS)} 秒`,
    },
    { id: "cost", label: COPY.cost, cell: (run) => `$${run.usdPerPage.toFixed(COST_DIGITS)}` },
    { id: "machine", label: COPY.machine, cell: (run) => run.machine },
  ],
};

const categoryTable = ({
  summary,
  id,
  title,
}: Readonly<{ summary: JaBenchSummary; id: string; title: string }>): Table => ({
  id,
  title,
  columns: pipe(
    summary.categories,
    Arr.filter(({ source }) => source === id),
    Arr.map((category) => ({
      id: category.id,
      label: category.label,
      cell: (run: EngineRun) => percent(run.byCategory[category.id] ?? NONE),
    })),
  ),
});

/** @stability experimental */
export const tablesOf = (summary: JaBenchSummary): readonly Table[] => [
  OVERALL,
  categoryTable({ summary, id: "synthetic", title: COPY.synthetic }),
  categoryTable({ summary, id: "jawildtext", title: COPY.jaWildText }),
];
