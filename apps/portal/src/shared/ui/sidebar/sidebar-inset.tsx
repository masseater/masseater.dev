import type { ReactNode } from "react";

export const SidebarInset = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div
    className="bg-background relative flex w-full min-w-0 flex-1 flex-col"
    data-slot="sidebar-inset"
  >
    {children}
  </div>
);
