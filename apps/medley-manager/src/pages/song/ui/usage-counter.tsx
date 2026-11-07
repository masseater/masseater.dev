import type { ReactNode } from "react";

const UNIT = "本";

const UsageCounter = ({ label, value }: Readonly<{ label: string; value: number }>): ReactNode => (
  <span className="bg-card flex flex-col rounded-lg border px-4 py-3">
    <span className="text-muted-foreground text-xs font-bold">{label}</span>
    <span className="font-display text-primary text-3xl tabular-nums">
      {value}
      <span className="text-foreground ml-1 font-sans text-sm">{UNIT}</span>
    </span>
  </span>
);

export { UsageCounter };
