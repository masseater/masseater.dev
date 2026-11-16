import type { ReactNode } from "react";

import type { MonthTotalValue } from "#/entities/money/index.ts";

import { MonthlyGrid } from "./monthly-grid.tsx";

const OPEN = "表で見る";

export const MonthlyTable = ({
  months,
}: Readonly<{ months: readonly MonthTotalValue[] }>): ReactNode => (
  <details className="group">
    <summary className="text-link cursor-pointer text-sm underline underline-offset-3 group-open:mb-3">
      {OPEN}
    </summary>
    <MonthlyGrid months={months} />
  </details>
);
