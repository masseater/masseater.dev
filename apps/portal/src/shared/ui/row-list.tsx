import type { ReactNode } from "react";

export const RowList = ({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>): ReactNode => (
  <ul aria-label={label} className="border-foreground/10 min-w-0 border-b">
    {children}
  </ul>
);
