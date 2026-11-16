import type { ReactNode } from "react";

import { SIGNED_YEN, YEN } from "#/entities/money/index.ts";
import type { MonthTotalValue } from "#/entities/money/index.ts";

const CELL = "border-b px-2 py-2 text-right tabular-nums";

export const MonthRow = ({ month }: Readonly<{ month: MonthTotalValue }>): ReactNode => (
  <tr>
    <th className="border-b px-2 py-2 text-left font-normal tabular-nums" scope="row">
      {month.month}
    </th>
    <td className={CELL}>{YEN.format(month.income)}</td>
    <td className={CELL}>{YEN.format(month.expense)}</td>
    <td className={CELL}>{SIGNED_YEN.format(month.balance)}</td>
  </tr>
);
