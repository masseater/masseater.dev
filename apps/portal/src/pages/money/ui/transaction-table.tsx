import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { TransactionValue } from "#/entities/money/index.ts";
import { TableFrame, TableHead } from "#/shared/ui/index.ts";
import type { Column } from "#/shared/ui/index.ts";

import { TransactionRow } from "./transaction-row";
import type { Labels } from "./transaction-row";

const LABEL = "出入金";

const COLUMNS: readonly Column[] = [
  { label: "日付", className: "w-28" },
  { label: "摘要" },
  { label: "カテゴリー", className: "w-40" },
  { label: "口座", className: "w-36" },
  { label: "金額", className: "w-32 text-right" },
];

export const TransactionTable = ({
  labels,
  transactions,
}: Readonly<{ labels: Labels; transactions: readonly TransactionValue[] }>): ReactNode => (
  <TableFrame label={LABEL}>
    <TableHead columns={COLUMNS} />
    <tbody>
      {pipe(
        transactions,
        Arr.map((transaction) => (
          <TransactionRow key={transaction.id} labels={labels} transaction={transaction} />
        )),
      )}
    </tbody>
  </TableFrame>
);
