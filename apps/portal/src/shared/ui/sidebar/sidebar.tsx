import type { ReactNode } from "react";

import { SidebarRail } from "./sidebar-rail.tsx";
import { useSidebarState } from "./sidebar-state.ts";

const COLLAPSIBLE = { expanded: "", collapsed: "icon" } as const;

export const Sidebar = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => {
  const state = useSidebarState();
  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-collapsible={COLLAPSIBLE[state]}
      data-side="left"
      data-slot="sidebar"
      data-state={state}
    >
      <div
        className="w-sidebar group-data-[collapsible=icon]:w-sidebar-icon relative bg-transparent transition-all duration-200 ease-linear"
        data-slot="sidebar-gap"
      />
      <div
        className="w-sidebar group-data-[collapsible=icon]:w-sidebar-icon border-sidebar-border fixed inset-y-0 left-0 z-10 hidden h-svh border-r transition-all duration-200 ease-linear md:flex"
        data-slot="sidebar-container"
      >
        <div className="bg-sidebar flex h-full w-full flex-col" data-slot="sidebar-inner">
          {children}
        </div>
        <SidebarRail />
      </div>
    </div>
  );
};
