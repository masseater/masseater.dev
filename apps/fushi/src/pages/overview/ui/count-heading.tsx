import type { ReactNode } from "react";

export const CountHeading = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <th className="w-16 p-2 text-right">{children}</th>
);
