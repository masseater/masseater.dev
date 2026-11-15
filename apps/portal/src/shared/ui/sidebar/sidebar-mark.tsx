import { LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";

import { SITE_NAME } from "#/shared/config/index.ts";

const OWNER = "masseater";

export const SidebarMark = (): ReactNode => (
  <>
    <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
      <LayoutDashboard aria-hidden className="size-4" />
    </span>
    <span className="grid flex-1 text-left leading-tight">
      <span className="truncate font-bold">{OWNER}</span>
      <span className="text-muted-foreground truncate text-xs">{SITE_NAME}</span>
    </span>
  </>
);
