import type { ReactNode } from "react";

import { Backdrop } from "#/shared/ui";
import { SiteFooter } from "#/widgets/site-footer";
import { SiteHeader } from "#/widgets/site-header";

import { SiteMain } from "./site-main";

const SiteLayout = (): ReactNode => (
  <div className="stage relative isolate flex min-h-dvh flex-col">
    <div className="fixed inset-0 -z-10">
      <Backdrop />
    </div>
    <SiteHeader />
    <SiteMain />
    <SiteFooter />
  </div>
);

export { SiteLayout };
