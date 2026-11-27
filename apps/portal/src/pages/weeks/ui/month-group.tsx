import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { MonthValue } from "#/pages/weeks/model/weeks.ts";

import { WeekBlock } from "./week-block.tsx";

export const MonthGroup = ({ month }: Readonly<{ month: MonthValue }>): ReactNode => (
  <section aria-label={month.label} className="flex flex-col gap-6">
    <h2 className="text-muted-foreground border-b pb-1 text-sm font-bold">{month.label}</h2>
    {pipe(
      month.weeks,
      Arr.map((week) => <WeekBlock key={week.start} week={week} />),
    )}
  </section>
);
