import type { ReactNode } from "react";

import { SIGNED_YEN, YEN } from "#/entities/money/index.ts";
import type { BalanceSheetValue, MoneyFlowValue } from "#/entities/money/index.ts";
import { Stat } from "#/shared/ui/index.ts";

const TEXT = {
  income: "収入総額",
  expense: "支出総額",
  balance: "収支",
  cash: "流動資産",
} as const;

export const MoneyStats = ({
  flow,
  sheet,
}: Readonly<{ flow: MoneyFlowValue; sheet: BalanceSheetValue }>): ReactNode => (
  <div className="grid min-w-0 gap-5 md:grid-cols-3">
    <Stat label={TEXT.income} tone="income" value={YEN.format(flow.income)} />
    <Stat label={TEXT.expense} tone="expense" value={YEN.format(flow.expense)} />
    <Stat
      label={TEXT.balance}
      note={`${TEXT.cash} ${YEN.format(sheet.left.currentAssets)}`}
      value={SIGNED_YEN.format(flow.income - flow.expense)}
    />
  </div>
);
