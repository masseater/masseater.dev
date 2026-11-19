import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { StrategyRow as Row } from "#/pages/report/model/review-hooks.ts";

import { StrategyHeading } from "./strategy-heading.tsx";
import { StrategyRow } from "./strategy-row.tsx";

export const StrategyTable = ({ rows }: Readonly<{ rows: readonly Row[] }>): ReactNode => (
  <table className="w-full table-fixed text-sm [&_:is(th,td)]:py-1 [&_:is(th,td)+:is(th,td)]:pl-6">
    <thead>
      <StrategyHeading />
    </thead>
    <tbody>
      {pipe(
        rows,
        Arr.map((row) => <StrategyRow key={row.strategy} row={row} />),
      )}
    </tbody>
  </table>
);
