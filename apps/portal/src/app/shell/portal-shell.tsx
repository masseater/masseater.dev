import type { ReactNode } from "react";

import {
  MobileSidebar,
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "#/shared/ui/sidebar/index.ts";

import { PortalHeader } from "./portal-header.tsx";
import { PortalNav } from "./portal-nav.tsx";

const SKIP = "本文へ移動";

const MAIN_ID = "content";

export const PortalShell = ({
  children,
  sidebarOpen,
}: Readonly<{ children: ReactNode; sidebarOpen: boolean }>): ReactNode => (
  <SidebarProvider defaultOpen={sidebarOpen}>
    <a
      className="bg-background ring-ring sr-only rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:ring-2"
      href={`#${MAIN_ID}`}
    >
      {SKIP}
    </a>
    <Sidebar>
      <PortalNav />
    </Sidebar>
    <MobileSidebar>
      <PortalNav />
    </MobileSidebar>
    <SidebarInset>
      <PortalHeader />
      <main id={MAIN_ID} className="flex w-full max-w-screen-2xl flex-1 flex-col gap-5 p-4 sm:p-6">
        {children}
      </main>
    </SidebarInset>
  </SidebarProvider>
);
