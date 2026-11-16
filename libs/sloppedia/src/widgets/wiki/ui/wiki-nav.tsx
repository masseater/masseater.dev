import type { ReactNode } from "react";

import { targets } from "#/shared/config/index.ts";
import type { SloppediaConfig } from "#/shared/config/index.ts";

import { HomeNavItem } from "./home-nav-item.tsx";
import { WikiNavItem } from "./wiki-nav-item.tsx";

export const WikiNav = ({ config }: Readonly<{ config: SloppediaConfig }>): ReactNode => (
  <nav aria-label={config.labels.nav(config.name)} className="ms-auto text-sm">
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      <WikiNavItem config={config} label={config.labels.mainPage} target={targets.main} />
      <WikiNavItem config={config} label={config.labels.categories} target={targets.categories} />
      <HomeNavItem config={config} />
    </ul>
  </nav>
);
