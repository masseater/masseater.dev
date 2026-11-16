import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { MonthTotalValue } from "#/entities/money/index.ts";
import { TableFrame, TableHead } from "#/shared/ui/index.ts";
import type { Column } from "#/shared/ui/index.ts";

import { MonthRow } from "./month-row.tsx";

const LABEL = "月ごとの収支";

const COLUMNS: readonly Column[] = [
  { label: "月" },
  { label: "収入", className: "text-right" },
  { label: "支出", className: "text-right" },
  { label: "収支", className: "text-right" },
];

export const MonthlyGrid = ({
  months,
}: Readonly<{ months: readonly MonthTotalValue[] }>): ReactNode => (
  <TableFrame label={LABEL}>
    <TableHead columns={COLUMNS} />
    <tbody>
      {pipe(
        months,
        Arr.map((month) => <MonthRow key={month.month} month={month} />),
      )}
    </tbody>
  </TableFrame>
);
