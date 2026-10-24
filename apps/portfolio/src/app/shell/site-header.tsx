import type { ReactNode } from "react";

import { CategoryLinkList, SiteLogo, SocialLinkList } from "#/widgets/site-nav";

const SiteHeader = (): ReactNode => (
  <header className="grid grid-cols-2 items-center gap-y-4 px-6 pt-8 sm:grid-cols-3">
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
