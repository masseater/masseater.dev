import { RegistryProvider } from "@effect/atom-react";
import type { ReactNode } from "react";

import { SiteFooter } from "./site-footer.tsx";
import { SiteHeader } from "./site-header.tsx";

const SKIP_TO_CONTENT = "本文へ移動";

export const AppShell = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <RegistryProvider>
    <a
      href="#content"
      className="bg-primary text-primary-foreground sr-only z-20 rounded-full px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-4"
    >
      {SKIP_TO_CONTENT}
    </a>
    <SiteHeader />
    <main id="content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 outline-hidden">
      {children}
    </main>
    <SiteFooter />
  </RegistryProvider>
);
