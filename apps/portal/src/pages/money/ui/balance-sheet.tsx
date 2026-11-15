import type { ReactNode } from "react";

import type { BalanceSheetValue } from "#/entities/money";
import { leftLines, rightLines } from "#/pages/money/model/sheet";

import { SheetSide } from "./sheet-side";

const TEXT = { assets: "資産", liabilities: "負債と純資産" } as const;

export const BalanceSheet = ({ sheet }: Readonly<{ sheet: BalanceSheetValue }>): ReactNode => (
  <div className="grid gap-8 sm:grid-cols-2">
    <SheetSide accounts={sheet.accounts} lines={leftLines(sheet)} title={TEXT.assets} />
    <SheetSide accounts={sheet.accounts} lines={rightLines(sheet)} title={TEXT.liabilities} />
  </div>
);
