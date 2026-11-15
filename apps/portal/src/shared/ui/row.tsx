import type { ReactNode } from "react";

export const Row = ({
  children,
  lead,
}: Readonly<{ children: ReactNode; lead: string }>): ReactNode => (
  <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
    <div className="text-muted-foreground shrink-0 text-sm tabular-nums sm:w-36">{lead}</div>
    <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
  </li>
);
