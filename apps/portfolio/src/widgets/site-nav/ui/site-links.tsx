import type { ReactNode } from "react";

import type { Direction } from "#/widgets/site-nav/model/direction";

import { CategoryLinkList } from "./category-link-list";
import { SocialLinkList } from "./social-link-list";

const WRAPPER_CLASS = {
  row: "stage-links flex flex-col items-center",
  column: "stage-links flex flex-col items-start gap-6",
} as const;

const SiteLinks = ({ direction }: Readonly<{ direction: Direction }>): ReactNode => (
  <div className={WRAPPER_CLASS[direction]}>
    <SocialLinkList direction={direction} />
    <CategoryLinkList direction={direction} />
  </div>
);

export { SiteLinks };
