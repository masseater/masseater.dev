import type { ReactNode } from "react";

export const LaneRow = ({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>): ReactNode => (
  <div className="text-muted-foreground flex items-center gap-2 text-xs">
    <span className="w-24 shrink-0 truncate" title={label}>
      {label}
    </span>
    {children}
  </div>
);
