import { Array as Arr, pipe } from "effect";

import type { MonthTotalValue } from "./money";

const NONE = 0;

export const hasMovement = (months: readonly MonthTotalValue[]): boolean =>
  pipe(
    months,
    Arr.some((row) => row.income > NONE || row.expense > NONE),
  );
