import type { Run, Summary } from "@ocr-decide/measurements/schema";
import { Array as Arr, pipe } from "effect";

import { COPY } from "./copy";
import { dollars, percent, rateIn, seconds } from "./summary";

interface Column {
  readonly id: string;
  readonly label: string;
  readonly cell: (run: Run) => string;
}

interface Table {
  readonly id: string;
  readonly title: string;
  readonly columns: readonly Column[];
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

const tablesOf = (summary: Summary): readonly Table[] => [
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

export { tablesOf };
export type { Column, Table };
