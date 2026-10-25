import type { ReactNode } from "react";

import { CategoryLinkList, SiteLogo, SocialLinkList } from "#/widgets/site-nav";

const SiteHeader = (): ReactNode => (
  <header
    className="site-header bg-background/90 sticky top-0 z-20 grid grid-cols-2 content-center items-center gap-y-3 px-6 backdrop-blur-xl sm:grid-cols-3"
    data-site-header
  >
    <SiteLogo />
    <div className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
      <CategoryLinkList direction="row" />
    </div>
    <div className="col-start-2 row-start-1 sm:col-start-3">
      <SocialLinkList direction="compact" />
    </div>
  </header>
);

export { SiteHeader };
