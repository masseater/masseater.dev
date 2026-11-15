import type { ReactNode } from "react";

import { signedYen, yen } from "#/entities/money";
import type { MonthTotalValue } from "#/entities/money";
import { Row } from "#/shared/ui";

const MonthRow = ({ month }: Readonly<{ month: MonthTotalValue }>): ReactNode => (
  <Row lead={month.month}>
    <p className="grid grid-cols-3 gap-4 text-sm tabular-nums">
      <span>{yen(month.income)}</span>
      <span>{yen(month.expense)}</span>
      <span className="text-foreground/70">{signedYen(month.balance)}</span>
    </p>
  </Row>
);

export { MonthRow };
