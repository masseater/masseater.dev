import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { StrategyRow as Row } from "#/pages/interview/model/review-hooks";

import { StrategyHeading } from "./strategy-heading.tsx";
import { StrategyRow } from "./strategy-row.tsx";

const StrategyTable = ({ rows }: Readonly<{ rows: readonly Row[] }>): ReactNode => (
  <div className="grid grid-cols-5 items-center gap-x-6 gap-y-2 text-sm">
    <StrategyHeading />
    {pipe(
      rows,
      Arr.map((row) => <StrategyRow key={row.strategy} row={row} />),
    )}
  </div>
);

export { StrategyTable };
