import type { ReactNode } from "react";

import { CategoryLinkList, SiteLogo, SocialLinkList } from "#/widgets/site-nav";

const SiteHeader = (): ReactNode => (
  <header className="flex flex-col items-center gap-6 px-6 pt-8">
    <div className="flex w-full items-center justify-between gap-4">
      <SiteLogo />
      <SocialLinkList direction="compact" />
    </div>
    <CategoryLinkList direction="row" />
  </header>
);

export { SiteHeader };
