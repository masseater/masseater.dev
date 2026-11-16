import type { ReactNode } from "react";

import { SectionLinkList } from "./section-link-list.tsx";
import { SocialLinkList } from "./social-link-list.tsx";

export const SiteLinks = (): ReactNode => (
  <div className="stage stage-links flex flex-col items-center" data-stage-layer>
    <SocialLinkList direction="row" />
    <SectionLinkList direction="row" />
  </div>
);
