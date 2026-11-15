import type { ReactNode } from "react";

export const SidebarGroup = ({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>): ReactNode => (
  <div className="relative flex w-full min-w-0 flex-col p-2" data-slot="sidebar-group">
    <div className="text-sidebar-foreground/70 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-all duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
      {label}
    </div>
    <ul aria-label={label} className="flex w-full min-w-0 flex-col gap-1">
      {children}
    </ul>
  </div>
);
