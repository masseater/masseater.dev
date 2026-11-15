import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Line } from "#/entities/extraction";

import { ResultRow } from "./result-row";

export const ResultRows = ({ lines }: Readonly<{ lines: readonly Line[] }>): ReactNode => (
  <tbody>
    {pipe(
      lines,
      Arr.map(({ label, value }) => <ResultRow key={label} label={label} value={value} />),
    )}
  </tbody>
);
