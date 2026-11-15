import { SiteStage } from "@masseater.dev/ui";
import type { ReactNode } from "react";

import { PortalLogo } from "./portal-logo";
import { PortalNav } from "./portal-nav";

export const PortalShell = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <SiteStage>
    <header className="bg-background/90 sticky top-0 z-20 flex h-14 items-center justify-between gap-1 px-4 backdrop-blur-xl sm:grid sm:h-15 sm:grid-cols-3 sm:gap-2 sm:px-6">
      <PortalLogo />
      <PortalNav />
    </header>
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12">
      {children}
    </main>
  </SiteStage>
);
