import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

import { MobileSheet } from "./mobile-sheet";
import { useMobileOpen, useSetMobileOpen } from "./sidebar-state";

export const MobileSidebar = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <Dialog.Root onOpenChange={useSetMobileOpen()} open={useMobileOpen()}>
    <Dialog.Portal>
      <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
      <MobileSheet>{children}</MobileSheet>
    </Dialog.Portal>
  </Dialog.Root>
);
