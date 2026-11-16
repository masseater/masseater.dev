import { Button } from "@masseater.dev/ui/button";
import { PanelLeft } from "lucide-react";
import type { ReactNode } from "react";

import { useToggleSidebar } from "./sidebar-state.ts";

const LABEL = "サイドバーを開閉";

export const SidebarTrigger = (): ReactNode => (
  <Button
    aria-label={LABEL}
    data-slot="sidebar-trigger"
    onClick={useToggleSidebar()}
    size="icon-sm"
    title={LABEL}
    variant="ghost"
  >
    <PanelLeft />
  </Button>
);
