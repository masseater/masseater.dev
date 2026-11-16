import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useSummary } from "#/pages/measurements/api/summary-query.ts";
import { keyOf } from "#/pages/measurements/model/summary.ts";
import type { Column } from "#/pages/measurements/model/tables.ts";

import { RunRow } from "./run-row.tsx";

export const RunRows = ({ columns }: Readonly<{ columns: readonly Column[] }>): ReactNode => {
  const { runs } = useSummary();
  return (
    <tbody>
      {pipe(
        runs,
        Arr.map((run) => <RunRow key={keyOf(run)} run={run} columns={columns} />),
      )}
    </tbody>
  );
};
