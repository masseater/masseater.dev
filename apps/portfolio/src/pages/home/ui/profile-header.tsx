import type { ReactNode } from "react";

import { SiteLinks } from "#/widgets/site-nav";

import { Name } from "./name";

const ProfileHeader = (): ReactNode => (
  <header className="vt-page-home flex flex-col items-center gap-8">
    <Name />
    <SiteLinks />
  </header>
);

export { ProfileHeader };
