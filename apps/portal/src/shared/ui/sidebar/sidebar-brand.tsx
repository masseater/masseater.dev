import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SidebarMark } from "./sidebar-mark.tsx";

export const SidebarBrand = (): ReactNode => (
  <div className="flex flex-col gap-2 p-2" data-slot="sidebar-header">
    <Link
      className="ring-sidebar-ring hover:bg-sidebar-accent flex h-12 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-all group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! focus-visible:ring-2"
      to="/"
    >
      <SidebarMark />
    </Link>
  </div>
);
