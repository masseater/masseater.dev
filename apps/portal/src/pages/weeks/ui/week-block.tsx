import type { ReactNode } from "react";

import type { WeekValue } from "#/pages/weeks/model/weeks.ts";

import { WeekContent } from "./week-content.tsx";

export const WeekBlock = ({ week }: Readonly<{ week: WeekValue }>): ReactNode => (
  <article className="flex gap-5" id={week.start}>
    <p className="text-muted-foreground w-24 shrink-0 pt-0.5 font-bold tabular-nums">
      {week.label}
    </p>
    <WeekContent week={week} />
  </article>
);
