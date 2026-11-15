import type { ReactNode } from "react";

import { SIGNED_YEN, YEN } from "#/entities/money";
import type { MonthTotalValue } from "#/entities/money";
import { Row } from "#/shared/ui";

export const MonthRow = ({ month }: Readonly<{ month: MonthTotalValue }>): ReactNode => (
  <Row lead={month.month}>
    <p className="grid grid-cols-3 gap-4 text-sm tabular-nums">
      <span>{YEN.format(month.income)}</span>
      <span>{YEN.format(month.expense)}</span>
      <span className="text-foreground/70">{SIGNED_YEN.format(month.balance)}</span>
    </p>
  </Row>
);
