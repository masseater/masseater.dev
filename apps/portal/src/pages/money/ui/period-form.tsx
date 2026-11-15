import { Button } from "@masseater.dev/ui/button";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { PeriodValue } from "#/entities/money";
import { recentMonths } from "#/pages/money/model/months";

import { MonthSelect } from "./month-select";

const TEXT = {
  from: "最初の月",
  to: "最後の月",
  show: "表示",
  between: "〜",
  asOf: "時点",
} as const;

const ACTION = "/money";

export const PeriodForm = ({
  asOf,
  period,
}: Readonly<{ asOf: string; period: PeriodValue }>): ReactNode => {
  const months = useMemo(() => recentMonths(asOf), [asOf]);
  return (
    <form action={ACTION} className="flex flex-wrap items-center gap-2" method="get">
      <MonthSelect label={TEXT.from} months={months} name="from" value={period.from} />
      <span className="text-muted-foreground text-sm">{TEXT.between}</span>
      <MonthSelect label={TEXT.to} months={months} name="to" value={period.to} />
      <Button type="submit" variant="outline">
        {TEXT.show}
      </Button>
      <p className="text-muted-foreground ml-auto text-sm tabular-nums">{`${asOf} ${TEXT.asOf}`}</p>
    </form>
  );
};
