import { Array as Arr, String as Str, pipe } from "effect";

import type { Category } from "#/entities/ledger/index.ts";
import { totalOn } from "#/entities/ledger/index.ts";

export type DayTotal = Readonly<{ date: string; category: Category; amount: number }>;

export type Month = Readonly<{ month: string; income: number; expense: number; balance: number }>;

export type MonthRange = Readonly<{ from: string; to: string; totals: readonly DayTotal[] }>;

const MONTHS_PER_YEAR = 12;

const FIRST_MONTH = 1;

const MONTH_LENGTH = 7;

const MONTH_WIDTH = 2;

const DECIMAL = 10;

const indexOf = (month: string): number => {
  const [year, part = ""] = Str.split("-")(month);
  return (
    Number.parseInt(year, DECIMAL) * MONTHS_PER_YEAR + Number.parseInt(part, DECIMAL) - FIRST_MONTH
  );
};

const monthAt = (index: number): string => {
  const year = Math.floor(index / MONTHS_PER_YEAR);
  const month = pipe(
    String((index % MONTHS_PER_YEAR) + FIRST_MONTH),
    Str.padStart(MONTH_WIDTH, "0"),
  );
  return `${year}-${month}`;
};

const MONTH_START = 0;

const monthOf = (date: string): string => pipe(date, Str.slice(MONTH_START, MONTH_LENGTH));

export const monthlyTotals = ({ from, to, totals }: MonthRange): readonly Month[] =>
  pipe(
    Arr.range(indexOf(from), indexOf(to)),
    Arr.map(monthAt),
    Arr.map((month) => {
      const rows = pipe(
        totals,
        Arr.filter(({ date }) => monthOf(date) === month),
      );
      const income = totalOn("income")(rows);
      const expense = totalOn("expense")(rows);
      return { month, income, expense, balance: income - expense };
    }),
  );
