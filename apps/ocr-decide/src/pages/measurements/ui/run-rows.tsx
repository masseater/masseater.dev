import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useSummary } from "#/pages/measurements/api/summary-query";
import { keyOf } from "#/pages/measurements/model/summary";
import type { Column } from "#/pages/measurements/model/tables";

import { RunRow } from "./run-row";

const RunRows = ({ columns }: Readonly<{ columns: readonly Column[] }>): ReactNode => {
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

export { RunRows };
