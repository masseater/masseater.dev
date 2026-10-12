import type { ReactNode } from "react";

import { categoryInfos } from "#/entities/entry";
import { site } from "#/shared/config";

import { Name } from "./name";
import { ProfileLink } from "./profile-link";

const links = [
  ...categoryInfos.map(({ category, title }) => ({ label: title, href: `/${category}` })),
  ...site.links,
];

const ProfileHeader = (): ReactNode => (
  <header className="flex flex-col items-center gap-8">
    <Name />
    <ul className="stage-links flex flex-wrap justify-center gap-x-4">
      {links.map(({ label, href }) => (
        <ProfileLink href={href} key={href} label={label} />
      ))}
    </ul>
  </header>
);

export { ProfileHeader };
