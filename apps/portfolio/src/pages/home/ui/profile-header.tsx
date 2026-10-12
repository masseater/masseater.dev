import type { ReactNode } from "react";

import { site } from "#/shared/config";

import { CategoryLinkRow } from "./category-link-row";
import { LinkRow } from "./link-row";
import { Name } from "./name";

const ProfileHeader = (): ReactNode => (
  <header className="vt-page-home flex flex-col items-center gap-8">
    <Name />
    <div className="stage-links flex flex-col items-center">
      <LinkRow links={site.links} />
      <CategoryLinkRow />
    </div>
  </header>
);

export { ProfileHeader };
