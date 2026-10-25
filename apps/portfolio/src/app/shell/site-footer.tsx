import type { ReactNode } from "react";

import { site } from "#/shared/config";
import { SocialLinkList } from "#/widgets/site-nav";

const FEED_LABEL = "RSS";

const SiteFooter = (): ReactNode => (
  <footer className="font-display flex items-center justify-center gap-4 px-4 pb-8 sm:hidden">
    <SocialLinkList direction="row" />
    <a className="stage-link px-2 py-3" href={site.feedPath}>
      {FEED_LABEL}
    </a>
  </footer>
);

export { SiteFooter };
