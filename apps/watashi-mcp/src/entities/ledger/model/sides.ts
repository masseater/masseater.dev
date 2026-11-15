import { Array as Arr, Number as Num, Option, pipe } from "effect";

import { flowOf } from "./categories";
import type { Category } from "./categories";

export type Side = "income" | "expense";

export type Signed = Readonly<{ category: Category; amount: number }>;

const SIGN: Readonly<Record<Side, number>> = { income: 1, expense: -1 };

const SIDES: Readonly<Record<ReturnType<typeof flowOf>, Option.Option<Side>>> = {
  income: Option.some("income"),
  expense: Option.some("expense"),
  transfer: Option.none(),
};

const sideOf = (category: Category): Option.Option<Side> => SIDES[flowOf(category)];

export const isOn =
  (side: Side) =>
  ({ category }: Signed): boolean =>
    Option.contains(sideOf(category), side);

export const valueOn =
  (side: Side) =>
  (amount: number): number =>
    amount * SIGN[side];

export const totalOn =
  (side: Side) =>
  (rows: readonly Signed[]): number =>
    pipe(
      rows,
      Arr.filter(isOn(side)),
      Arr.map(({ amount }) => valueOn(side)(amount)),
      Num.sumAll,
    );
