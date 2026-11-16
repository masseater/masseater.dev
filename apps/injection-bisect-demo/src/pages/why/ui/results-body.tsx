import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { ROWS } from "#/pages/why/model/results.ts";

import { ResultsRow } from "./results-row.tsx";

export const ResultsBody = (): ReactNode => (
  <tbody>
    {pipe(
      ROWS,
      Arr.map((row) => <ResultsRow key={row.label} row={row} />),
    )}
  </tbody>
);
