import { Array as Arr, Number as Num, pipe } from "effect";

import type { AccountBalanceValue, BalanceSheetValue } from "#/entities/money/index.ts";

export type BlockTone =
  | "current-asset"
  | "fixed-asset"
  | "debt-excess"
  | "current-liability"
  | "fixed-liability"
  | "net-assets";

export type SheetBlock = Readonly<{
  label: string;
  amount: number;
  tone: BlockTone;
  accounts: readonly AccountBalanceValue[];
}>;

const TEXT = {
  currentAssets: "流動資産",
  fixedAssets: "固定資産",
  debtExcess: "債務超過",
  currentLiabilities: "流動負債",
  fixedLiabilities: "固定負債",
  netAssets: "純資産",
} as const;

const NONE = 0;

const accountsOf = ({
  accounts,
  tone,
}: Readonly<{
  accounts: readonly AccountBalanceValue[];
  tone: BlockTone;
}>): readonly AccountBalanceValue[] =>
  pipe(
    accounts,
    Arr.filter((account) => account.class === tone),
  );

const block = ({
  accounts,
  amount,
  label,
  tone,
}: Readonly<{
  accounts: readonly AccountBalanceValue[];
  amount: number;
  label: string;
  tone: BlockTone;
}>): SheetBlock => ({ label, amount, tone, accounts: accountsOf({ accounts, tone }) });

const visible = (blocks: readonly SheetBlock[]): readonly SheetBlock[] =>
  pipe(
    blocks,
    Arr.filter((entry) => entry.amount > NONE),
  );

export const leftBlocks = (sheet: BalanceSheetValue): readonly SheetBlock[] =>
  visible([
    block({
      accounts: sheet.accounts,
      amount: sheet.left.currentAssets,
      label: TEXT.currentAssets,
      tone: "current-asset",
    }),
    block({
      accounts: sheet.accounts,
      amount: sheet.left.fixedAssets,
      label: TEXT.fixedAssets,
      tone: "fixed-asset",
    }),
    block({
      accounts: sheet.accounts,
      amount: sheet.left.debtExcess,
      label: TEXT.debtExcess,
      tone: "debt-excess",
    }),
  ]);

export const rightBlocks = (sheet: BalanceSheetValue): readonly SheetBlock[] =>
  visible([
    block({
      accounts: sheet.accounts,
      amount: sheet.right.currentLiabilities,
      label: TEXT.currentLiabilities,
      tone: "current-liability",
    }),
    block({
      accounts: sheet.accounts,
      amount: sheet.right.fixedLiabilities,
      label: TEXT.fixedLiabilities,
      tone: "fixed-liability",
    }),
    block({
      accounts: sheet.accounts,
      amount: sheet.right.netAssets,
      label: TEXT.netAssets,
      tone: "net-assets",
    }),
  ]);

export const sideTotal = (blocks: readonly SheetBlock[]): number =>
  pipe(
    blocks,
    Arr.map((entry) => entry.amount),
    Num.sumAll,
  );
