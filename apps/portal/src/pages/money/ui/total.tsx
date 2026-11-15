import type { ReactNode } from "react";

const Total = ({ label, value }: Readonly<{ label: string; value: string }>): ReactNode => (
  <div className="flex items-baseline gap-3">
    <dt className="font-display text-foreground/50 text-xs tracking-widest">{label}</dt>
    <dd className="font-display text-xl font-light tabular-nums">{value}</dd>
  </div>
);

export { Total };
