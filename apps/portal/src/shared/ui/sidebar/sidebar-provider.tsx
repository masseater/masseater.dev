import { Tooltip } from "radix-ui";
import type { ReactNode } from "react";

import { SidebarShortcut } from "./sidebar-shortcut";
import { sidebarRegistry } from "./sidebar-state";

const NO_DELAY = 0;

export const SidebarProvider = ({
  children,
  defaultOpen,
}: Readonly<{ children: ReactNode; defaultOpen: boolean }>): ReactNode =>
  sidebarRegistry({
    open: defaultOpen,
    children: (
      <Tooltip.Provider delayDuration={NO_DELAY}>
        <SidebarShortcut />
        <div className="group/sidebar-wrapper flex min-h-svh w-full" data-slot="sidebar-wrapper">
          {children}
        </div>
      </Tooltip.Provider>
    ),
  });
