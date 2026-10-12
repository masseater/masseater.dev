import type { ReactNode } from "react";

const LABEL = "RSS";
const HREF = "/feed.xml";

const FeedLink = (): ReactNode => (
  <p className="flex justify-center pb-8">
    <a className="stage-link px-2 py-3" href={HREF}>
      {LABEL}
    </a>
  </p>
);

export { FeedLink };
