import type { ReactNode } from "react";

export const Row = ({
  children,
  lead,
}: Readonly<{ children: ReactNode; lead: string }>): ReactNode => (
  <li className="border-foreground/10 flex flex-col gap-2 border-t py-4 sm:flex-row sm:items-baseline sm:gap-8">
    <div className="font-display text-foreground/50 shrink-0 text-xs tracking-widest tabular-nums sm:w-40">
      {lead}
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</div>
  </li>
);
