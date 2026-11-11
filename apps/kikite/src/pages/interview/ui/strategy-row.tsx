import type { ReactNode } from "react";

import type { StrategyRow as Row } from "#/pages/interview/model/review-hooks";
import { STRATEGIES } from "#strategies";

const StrategyRow = ({ row }: Readonly<{ row: Row }>): ReactNode => (
  <>
    <span className="font-medium">{STRATEGIES[row.strategy].label}</span>
    <span className="text-right tabular-nums">{row.asked}</span>
    <span className="text-right tabular-nums">{row.good}</span>
    <span className="text-right tabular-nums">{row.off}</span>
  </>
);

export { StrategyRow };
