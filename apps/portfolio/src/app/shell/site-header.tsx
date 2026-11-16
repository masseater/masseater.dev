import type { ReactNode } from "react";

import { SectionLinkList, SiteLogo } from "#/widgets/site-nav/index.ts";

export const SiteHeader = (): ReactNode => (
  <header
    className="site-header bg-background/90 sticky top-0 z-20 flex flex-wrap content-center items-center px-4 backdrop-blur-xl sm:grid sm:grid-cols-3 sm:gap-2 sm:px-6"
    data-site-header
  >
    <SiteLogo />
    <SectionLinkList direction="header" />
  </header>
);
