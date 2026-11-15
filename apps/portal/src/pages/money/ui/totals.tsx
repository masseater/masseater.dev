import type { ReactNode } from "react";

import { signedYen, yen } from "#/entities/money";
import type { MoneyFlowValue } from "#/entities/money";

import { Total } from "./total";

const TEXT = { income: "収入", expense: "支出", balance: "収支" } as const;

const Totals = ({ flow }: Readonly<{ flow: MoneyFlowValue }>): ReactNode => (
  <dl className="flex flex-wrap gap-x-10 gap-y-2">
    <Total label={TEXT.income} value={yen(flow.income)} />
    <Total label={TEXT.expense} value={yen(flow.expense)} />
    <Total label={TEXT.balance} value={signedYen(flow.income - flow.expense)} />
  </dl>
);

export { Totals };
