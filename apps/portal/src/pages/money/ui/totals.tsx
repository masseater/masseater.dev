import type { ReactNode } from "react";

import { SIGNED_YEN, YEN } from "#/entities/money";
import type { MoneyFlowValue } from "#/entities/money";

import { Total } from "./total";

const TEXT = { income: "収入", expense: "支出", balance: "収支" } as const;

export const Totals = ({ flow }: Readonly<{ flow: MoneyFlowValue }>): ReactNode => (
  <dl className="flex flex-wrap gap-x-10 gap-y-2">
    <Total label={TEXT.income} value={YEN.format(flow.income)} />
    <Total label={TEXT.expense} value={YEN.format(flow.expense)} />
    <Total label={TEXT.balance} value={SIGNED_YEN.format(flow.income - flow.expense)} />
  </dl>
);
