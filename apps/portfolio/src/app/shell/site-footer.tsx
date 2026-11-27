import { PageFooter } from "@masseater.dev/ui/page-footer";
import type { ReactNode } from "react";

import { site } from "#/shared/config/index.ts";
import { SocialLinkList } from "#/widgets/site-nav/index.ts";

const FEED_LABEL = "RSS";

export const SiteFooter = (): ReactNode => (
  <PageFooter variant="links">
    <SocialLinkList direction="row" />
    <a className="stage-link px-2 py-3 sm:hidden" href={site.feedPath}>
      {FEED_LABEL}
    </a>
  </PageFooter>
);
