import type { ReactNode } from "react";

import { site } from "#/shared/config";

const LABEL = "RSS";

const FeedLink = (): ReactNode => (
  <p className="vt-feed feed-slide-in fixed right-4 bottom-4 z-10 hidden sm:block">
    <a className="stage-link px-2 py-3" href={site.feedPath}>
      {LABEL}
    </a>
  </p>
);

export { FeedLink };
