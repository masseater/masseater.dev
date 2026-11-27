import { Table } from "@masseater.dev/ui/table";
import type { ColumnHeading } from "@masseater.dev/ui/table";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { MonthTotalValue } from "#/entities/money/index.ts";
import { TableHead } from "#/shared/ui/index.ts";

import { MonthRow } from "./month-row.tsx";

const LABEL = "月ごとの収支";

const COLUMNS: readonly ColumnHeading[] = [
  { label: "月" },
  { label: "収入", className: "text-right" },
  { label: "支出", className: "text-right" },
  { label: "収支", className: "text-right" },
];

export const MonthlyGrid = ({
  months,
}: Readonly<{ months: readonly MonthTotalValue[] }>): ReactNode => (
  <Table label={LABEL} className="min-w-xl">
    <TableHead columns={COLUMNS} />
    <tbody>
      {pipe(
        months,
        Arr.map((month) => <MonthRow key={month.month} month={month} />),
      )}
    </tbody>
  </Table>
);
