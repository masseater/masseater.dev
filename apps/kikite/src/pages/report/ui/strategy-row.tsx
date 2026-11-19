import type { ReactNode } from "react";

import type { StrategyRow as Row } from "#/pages/report/model/review-hooks.ts";
import { STRATEGIES } from "#/shared/config/index.ts";

export const StrategyRow = ({ row }: Readonly<{ row: Row }>): ReactNode => (
  <tr>
    <th scope="row" className="text-left font-medium">
      {STRATEGIES[row.strategy].label}
    </th>
    <td className="text-right tabular-nums">{row.asked}</td>
    <td className="text-right tabular-nums">{row.good}</td>
    <td className="text-right tabular-nums">{row.off}</td>
  </tr>
);
