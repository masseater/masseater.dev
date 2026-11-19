import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

const TITLE = "メニュー";

const TITLE_ID = "mobile-sidebar-title";

export const MobileSheet = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <Dialog.Content
    aria-describedby={TITLE_ID}
    className="bg-sidebar text-sidebar-foreground data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:data-[state=closed]:fade-out-0 motion-reduce:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:slide-out-to-left motion-safe:data-[state=open]:slide-in-from-left w-sidebar-mobile fixed inset-y-0 left-0 z-50 flex h-full flex-col shadow-lg"
    data-mobile="true"
    data-slot="sidebar"
  >
    <Dialog.Title className="sr-only" id={TITLE_ID}>
      {TITLE}
    </Dialog.Title>
    {children}
  </Dialog.Content>
);
