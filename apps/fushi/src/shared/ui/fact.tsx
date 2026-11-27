import type { ReactNode } from "react";

export const Fact = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <span className="inline-flex items-center rounded-sm border px-2 text-xs whitespace-nowrap tabular-nums">
    {children}
  </span>
);
