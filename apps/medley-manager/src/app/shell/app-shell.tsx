import { RegistryProvider } from "@effect/atom-react";
import type { ReactNode } from "react";

import { SiteFooter } from "./site-footer.tsx";
import { SiteHeader } from "./site-header.tsx";

export const AppShell = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <RegistryProvider>
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    <SiteFooter />
  </RegistryProvider>
);
