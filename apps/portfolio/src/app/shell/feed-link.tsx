import type { ReactNode } from "react";

const LABEL = "RSS";
const HREF = "/feed.xml";

const FeedLink = (): ReactNode => (
  <p className="vt-feed feed-slide-in fixed right-4 bottom-4 z-10">
    <a className="stage-link px-2 py-3" href={HREF}>
      {LABEL}
    </a>
  </p>
);

export { FeedLink };
