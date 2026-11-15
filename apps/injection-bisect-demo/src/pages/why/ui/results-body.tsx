import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { ROWS } from "#/pages/why/model/results";

import { ResultsRow } from "./results-row";

export const ResultsBody = (): ReactNode => (
  <tbody>
    {pipe(
      ROWS,
      Arr.map((row) => <ResultsRow key={row.label} row={row} />),
    )}
  </tbody>
);
