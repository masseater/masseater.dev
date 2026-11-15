import { Array as Arr, pipe } from "effect";

import type { MonthTotalValue } from "#/entities/money";

export type MonthlyRow = Readonly<{
  month: string;
  income: number;
  expense: number;
  balance: number;
}>;

export const monthlyRows = (months: readonly MonthTotalValue[]): readonly MonthlyRow[] =>
  pipe(
    months,
    Arr.map((row) => ({
      month: row.month,
      income: row.income,
      expense: -row.expense,
      balance: row.balance,
    })),
  );
