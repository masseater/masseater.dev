import type { ReactNode } from "react";

export const OpenBody = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-muted mt-2 flex flex-col gap-2 rounded-md border-l-4 px-4 py-3 text-sm">
    {children}
  </div>
);
