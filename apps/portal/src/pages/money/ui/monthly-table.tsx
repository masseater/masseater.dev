import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { MonthTotalValue } from "#/entities/money";
import { RowList } from "#/shared/ui";

import { MonthRow } from "./month-row";

const LABEL = "月ごとの数字";

export const MonthlyTable = ({
  months,
}: Readonly<{ months: readonly MonthTotalValue[] }>): ReactNode => (
  <details>
    <summary className="font-display text-foreground/50 hover:text-foreground cursor-pointer text-xs tracking-widest">
      {LABEL}
    </summary>
    <RowList label={LABEL}>
      {pipe(
        months,
        Arr.map((month) => <MonthRow key={month.month} month={month} />),
      )}
    </RowList>
  </details>
);
