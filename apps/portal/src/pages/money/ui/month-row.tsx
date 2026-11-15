import type { ReactNode } from "react";

import { signedYen, yen } from "#/entities/money";
import type { MonthTotalValue } from "#/entities/money";

const CELL = "border-b px-2 py-2 text-right tabular-nums";

export const MonthRow = ({ month }: Readonly<{ month: MonthTotalValue }>): ReactNode => (
  <tr>
    <th className="border-b px-2 py-2 text-left font-normal tabular-nums" scope="row">
      {month.month}
    </th>
    <td className={CELL}>{yen(month.income)}</td>
    <td className={CELL}>{yen(month.expense)}</td>
    <td className={CELL}>{signedYen(month.balance)}</td>
  </tr>
);
