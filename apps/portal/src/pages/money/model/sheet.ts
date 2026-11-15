import { Array as Arr, pipe } from "effect";

import type { AccountBalanceValue, BalanceSheetValue } from "#/entities/money";

export type SheetLine = Readonly<{ label: string; amount: number; classes: readonly string[] }>;

const TEXT = {
  currentAssets: "流動資産",
  fixedAssets: "固定資産",
  debtExcess: "債務超過",
  currentLiabilities: "流動負債",
  fixedLiabilities: "固定負債",
  netAssets: "純資産",
} as const;

const NONE = 0;

const shown = (line: SheetLine): boolean =>
  line.amount !== NONE || Arr.isReadonlyArrayNonEmpty(line.classes);

export const leftLines = (sheet: BalanceSheetValue): readonly SheetLine[] =>
  pipe(
    [
      { label: TEXT.currentAssets, amount: sheet.left.currentAssets, classes: ["current-asset"] },
      { label: TEXT.fixedAssets, amount: sheet.left.fixedAssets, classes: ["fixed-asset"] },
      { label: TEXT.debtExcess, amount: sheet.left.debtExcess, classes: [] },
    ],
    Arr.filter(shown),
  );

export const rightLines = (sheet: BalanceSheetValue): readonly SheetLine[] =>
  pipe(
    [
      {
        label: TEXT.currentLiabilities,
        amount: sheet.right.currentLiabilities,
        classes: ["current-liability"],
      },
      {
        label: TEXT.fixedLiabilities,
        amount: sheet.right.fixedLiabilities,
        classes: ["fixed-liability"],
      },
      { label: TEXT.netAssets, amount: sheet.right.netAssets, classes: [] },
    ],
    Arr.filter(shown),
  );

export const accountsIn =
  (line: SheetLine) =>
  (accounts: readonly AccountBalanceValue[]): readonly AccountBalanceValue[] =>
    pipe(
      accounts,
      Arr.filter((account) => Arr.contains(line.classes, account.class)),
    );
