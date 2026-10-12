import type { ReactNode } from "react";

import { SiteLinks, SiteLogo } from "#/widgets/site-nav";

import { FeedLink } from "./feed-link";
import { SiteMain } from "./site-main";
import { SiteStage } from "./site-stage";

const SiteLayout = (): ReactNode => (
  <SiteStage>
    <header className="flex flex-col items-center gap-4 px-4 pt-14">
      <SiteLogo size="large" />
      <SiteLinks direction="row" />
    </header>
    <SiteMain />
    <FeedLink />
  </SiteStage>
);

export { SiteLayout };
