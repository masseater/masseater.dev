import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Line } from "#/pages/extract/model/result";

import { ResultRow } from "./result-row";

const ResultRows = ({ lines }: Readonly<{ lines: readonly Line[] }>): ReactNode => (
  <tbody>
    {pipe(
      lines,
      Arr.map(({ label, value }) => <ResultRow key={label} label={label} value={value} />),
    )}
  </tbody>
);

export { ResultRows };
