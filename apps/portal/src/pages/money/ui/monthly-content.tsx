import type { ReactNode } from "react";

import { hasMovement } from "#/entities/money/index.ts";
import type { MonthTotalValue } from "#/entities/money/index.ts";

import { MonthlyBody } from "./monthly-body.tsx";

const EMPTY = "この期間の取引はありません";

export const MonthlyContent = ({
  months,
  title,
}: Readonly<{ months: readonly MonthTotalValue[]; title: string }>): ReactNode => {
  if (hasMovement(months)) {
    return <MonthlyBody months={months} title={title} />;
  }
  return <p className="text-muted-foreground text-sm">{EMPTY}</p>;
};
