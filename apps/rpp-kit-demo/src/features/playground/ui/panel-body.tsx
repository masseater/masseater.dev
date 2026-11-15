import type { ReactNode } from "react";

export const PanelBody = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="min-h-0 flex-1 overflow-auto">{children}</div>
);
