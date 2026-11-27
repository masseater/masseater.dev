import type { ReactNode } from "react";

export const PageSections = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="flex flex-col gap-10">{children}</div>
);
