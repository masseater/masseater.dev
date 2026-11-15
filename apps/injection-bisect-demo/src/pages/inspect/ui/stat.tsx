import type { ReactNode } from "react";

export const Stat = ({ label, value }: Readonly<{ label: string; value: string }>): ReactNode => (
  <div>
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd>{value}</dd>
  </div>
);
