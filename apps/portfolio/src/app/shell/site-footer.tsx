import type { ReactNode } from "react";

import { site } from "#/shared/config";
import { SocialLinkList } from "#/widgets/site-nav";

const FEED_LABEL = "RSS";

export const SiteFooter = (): ReactNode => (
  <footer className="font-display flex items-center justify-center gap-4 px-4 pb-8">
    <SocialLinkList direction="row" />
    <a className="stage-link px-2 py-3 sm:hidden" href={site.feedPath}>
      {FEED_LABEL}
    </a>
  </footer>
);
