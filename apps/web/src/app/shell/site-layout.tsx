import { RegistryProvider } from "@effect/atom-react";
import type { ReactNode } from "react";

import { SiteFooter } from "#/widgets/site-footer";
import { SiteHeader } from "#/widgets/site-header";

const SiteLayout = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <RegistryProvider>
    <SiteHeader />
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">{children}</main>
    <SiteFooter />
  </RegistryProvider>
);

export { SiteLayout };
