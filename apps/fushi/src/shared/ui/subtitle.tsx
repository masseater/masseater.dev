import type { ReactNode } from "react";

export const Subtitle = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <h2 className="mt-6 text-lg font-semibold">{children}</h2>
);
