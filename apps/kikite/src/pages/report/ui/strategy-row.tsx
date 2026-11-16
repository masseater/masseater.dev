import type { ReactNode } from "react";

import type { StrategyRow as Row } from "#/pages/report/model/review-hooks.ts";
import { STRATEGIES } from "#/shared/config/index.ts";

export const StrategyRow = ({ row }: Readonly<{ row: Row }>): ReactNode => (
  <>
    <span className="font-medium">{STRATEGIES[row.strategy].label}</span>
    <span className="text-right tabular-nums">{row.asked}</span>
    <span className="text-right tabular-nums">{row.good}</span>
    <span className="text-right tabular-nums">{row.off}</span>
  </>
);
