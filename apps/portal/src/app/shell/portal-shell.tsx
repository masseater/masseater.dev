import type { ReactNode } from "react";

import { MobileSidebar, Sidebar, SidebarInset, SidebarProvider } from "#/shared/ui/sidebar";

import { PortalHeader } from "./portal-header";
import { PortalNav } from "./portal-nav";

export const PortalShell = ({
  children,
  sidebarOpen,
}: Readonly<{ children: ReactNode; sidebarOpen: boolean }>): ReactNode => (
  <SidebarProvider defaultOpen={sidebarOpen}>
    <Sidebar>
      <PortalNav />
    </Sidebar>
    <MobileSidebar>
      <PortalNav />
    </MobileSidebar>
    <SidebarInset>
      <PortalHeader />
      <main className="flex w-full max-w-screen-2xl flex-1 flex-col gap-5 p-4 sm:p-6">
        {children}
      </main>
    </SidebarInset>
  </SidebarProvider>
);
