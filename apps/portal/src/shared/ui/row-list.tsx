import type { ReactNode } from "react";

export const RowList = ({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>): ReactNode => (
  <ul aria-label={label} className="divide-border min-w-0 divide-y">
    {children}
  </ul>
);
