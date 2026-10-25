import type { ReactNode } from "react";

import { FeedLink } from "./feed-link";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SiteMain } from "./site-main";

const SiteLayout = (): ReactNode => (
  <>
    <SiteHeader />
    <SiteMain />
    <SiteFooter />
    <FeedLink />
  </>
);

export { SiteLayout };
