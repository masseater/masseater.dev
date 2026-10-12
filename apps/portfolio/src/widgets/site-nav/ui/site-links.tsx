import type { ReactNode } from "react";

import { CategoryLinkList } from "./category-link-list";
import { SocialLinkList } from "./social-link-list";

const SiteLinks = (): ReactNode => (
  <div className="stage-links flex flex-col items-center">
    <SocialLinkList direction="row" />
    <CategoryLinkList direction="row" />
  </div>
);

export { SiteLinks };
