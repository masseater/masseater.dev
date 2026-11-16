import type { ReactNode } from "react";

import { FeedLink } from "./feed-link.tsx";
import { SiteFooter } from "./site-footer.tsx";
import { SiteHeader } from "./site-header.tsx";
import { SiteMain } from "./site-main.tsx";

export const SiteLayout = (): ReactNode => (
  <>
    <SiteHeader />
    <SiteMain />
    <SiteFooter />
    <FeedLink />
  </>
);
