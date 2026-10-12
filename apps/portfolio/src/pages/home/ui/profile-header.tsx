import type { ReactNode } from "react";

import { categoryInfos } from "#/entities/entry";
import { site } from "#/shared/config";

import { LinkRow } from "./link-row";
import { Name } from "./name";

const categoryLinks = categoryInfos.map(({ category, title }) => ({
  label: title,
  href: `/${category}`,
}));

const ProfileHeader = (): ReactNode => (
  <header className="flex flex-col items-center gap-8">
    <Name />
    <div className="stage-links flex flex-col items-center">
      <LinkRow links={site.links} />
      <LinkRow links={categoryLinks} />
    </div>
  </header>
);

export { ProfileHeader };
