import type { ReactNode } from "react";

import { signedYen, yen } from "#/entities/money";
import type { BalanceSheetValue, MoneyFlowValue } from "#/entities/money";
import { Stat } from "#/shared/ui";

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
    <Stat label={TEXT.income} tone="income" value={yen(flow.income)} />
    <Stat label={TEXT.expense} tone="expense" value={yen(flow.expense)} />
    <Stat
      label={TEXT.balance}
      note={`${TEXT.cash} ${yen(sheet.left.currentAssets)}`}
      value={signedYen(flow.income - flow.expense)}
    />
  </div>
);
