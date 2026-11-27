import type { ReactNode } from "react";

export const Title = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <h1 className="text-2xl font-bold text-balance">{children}</h1>
);
