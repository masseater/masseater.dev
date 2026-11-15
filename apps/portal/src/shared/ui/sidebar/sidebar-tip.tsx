import { Tooltip } from "radix-ui";
import type { ReactNode } from "react";

import { useSidebarOpen } from "./sidebar-state";

const GAP = 4;

export const SidebarTip = ({ label }: Readonly<{ label: string }>): ReactNode =>
  !useSidebarOpen() && (
    <Tooltip.Portal>
      <Tooltip.Content
        className="bg-foreground text-background animate-in fade-in-0 z-50 rounded-md px-3 py-1.5 text-xs"
        side="right"
        sideOffset={GAP}
      >
        {label}
      </Tooltip.Content>
    </Tooltip.Portal>
  );
