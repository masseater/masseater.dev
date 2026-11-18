import type { ReactNode } from "react";

export const PillItem = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <li className="bg-card hover:border-primary rounded-full border px-4 py-2 font-bold transition-colors">
    {children}
  </li>
);
