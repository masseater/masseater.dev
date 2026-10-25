import type { ReactNode } from "react";

import { CategoryLinkList, SiteLogo, SocialLinkList } from "#/widgets/site-nav";

const SiteHeader = (): ReactNode => (
  <header
    className="site-header bg-background/90 sticky top-0 z-20 flex items-center justify-between gap-2 px-4 backdrop-blur-xl sm:grid sm:grid-cols-3 sm:px-6"
    data-site-header
  >
    <SiteLogo />
    <CategoryLinkList direction="header" />
    <div className="hidden sm:block">
      <SocialLinkList direction="compact" />
    </div>
  </header>
);

export { SiteHeader };
