import type { ReactNode } from "react";

import type { OverviewValue } from "#/entities/money";

import { MonthlyCard } from "./monthly-card";
import { SheetCard } from "./sheet-card";

export const MoneyCharts = ({ overview }: Readonly<{ overview: OverviewValue }>): ReactNode => (
  <div className="grid min-w-0 gap-5 xl:grid-cols-5">
    <div className="min-w-0 xl:col-span-3">
      <MonthlyCard months={overview.months} />
    </div>
    <div className="min-w-0 xl:col-span-2">
      <SheetCard asOf={overview.asOf} sheet={overview.sheet} />
    </div>
  </div>
);
