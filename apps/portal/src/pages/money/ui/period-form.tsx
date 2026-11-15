import type { ReactNode } from "react";

import type { PeriodValue } from "#/entities/money";

const TEXT = { from: "最初の月", to: "最後の月", show: "表示", between: "から" } as const;

const ACTION = "/money";

const FIELD =
  "border-foreground/20 focus-visible:border-foreground w-24 border-b bg-transparent py-1 font-display text-sm tabular-nums outline-none";

export const PeriodForm = ({ period }: Readonly<{ period: PeriodValue }>): ReactNode => (
  <form action={ACTION} className="flex flex-wrap items-end gap-4" method="get">
    <input
      aria-label={TEXT.from}
      className={FIELD}
      defaultValue={period.from}
      name="from"
      required
      inputMode="numeric"
      pattern="\d{4}-\d{2}"
      placeholder="YYYY-MM"
      type="text"
    />
    <span className="text-foreground/40 pb-1 text-xs">{TEXT.between}</span>
    <input
      aria-label={TEXT.to}
      className={FIELD}
      defaultValue={period.to}
      name="to"
      required
      inputMode="numeric"
      pattern="\d{4}-\d{2}"
      placeholder="YYYY-MM"
      type="text"
    />
    <button className="stage-link" type="submit">
      {TEXT.show}
    </button>
  </form>
);
