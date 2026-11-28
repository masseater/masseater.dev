import type { Run, Summary } from "@ocr-decide/measurements/schema";
import { Array as Arr, pipe } from "effect";

import type { Column } from "#/shared/ui/value-table.ts";

import { COPY } from "./copy.ts";
import { dollars, percent, rateIn, seconds } from "./summary.ts";

/** @stability experimental */
export type RunColumn = Column<Run>;

/** @stability experimental */
export interface Table {
  readonly id: string;
  readonly title: string;
  readonly columns: readonly RunColumn[];
}

const OVERALL: Table = {
  id: "overall",
  title: COPY.overall,
  columns: [
    { id: "accuracy", label: COPY.accuracy, cell: (run) => percent(run.accuracy) },
    { id: "seconds", label: COPY.seconds, cell: (run) => seconds(run.secondsPerDocument) },
    { id: "cost", label: COPY.cost, cell: (run) => dollars(run.usdPerDocument) },
  ],
};

/** @stability experimental */
export const tablesOf = (summary: Summary): readonly Table[] => [
  OVERALL,
  {
    id: "group",
    title: COPY.byGroup,
    columns: pipe(
      summary.groups,
      Arr.map(({ id, label }) => ({
        id,
        label,
        cell: (run: Run) => rateIn({ rates: run.byGroup, id }),
      })),
    ),
  },
  {
    id: "field",
    title: COPY.byField,
    columns: pipe(
      summary.fields,
      Arr.map(({ id, label }) => ({
        id,
        label,
        cell: (run: Run) => rateIn({ rates: run.byField, id }),
      })),
    ),
  },
];
