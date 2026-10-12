import type { ReactNode } from "react";

import { FeedLink } from "./feed-link";
import { SiteHeader } from "./site-header";
import { SiteMain } from "./site-main";
import { SiteStage } from "./site-stage";

const SiteLayout = (): ReactNode => (
  <SiteStage>
    <SiteHeader />
    <SiteMain />
    <FeedLink />
  </SiteStage>
);

export { SiteLayout };
