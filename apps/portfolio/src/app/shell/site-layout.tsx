import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Backdrop } from "#/shared/ui";
import { SiteFooter } from "#/widgets/site-footer";
import { SiteHeader } from "#/widgets/site-header";

const SiteLayout = (): ReactNode => (
  <div className="stage relative isolate flex min-h-dvh flex-col">
    <div className="fixed inset-0 -z-10">
      <Backdrop />
    </div>
    <SiteHeader />
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Outlet />
    </main>
    <SiteFooter />
  </div>
);

export { SiteLayout };
