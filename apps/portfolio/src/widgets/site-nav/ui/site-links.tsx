import type { ReactNode } from "react";

import { CategoryLinkList } from "./category-link-list";
import { SocialLinkList } from "./social-link-list";

const SiteLinks = (): ReactNode => (
  <div className="stage stage-links flex flex-col items-center" data-stage-layer>
    <SocialLinkList direction="row" />
    <CategoryLinkList direction="row" />
  </div>
);

export { SiteLinks };
