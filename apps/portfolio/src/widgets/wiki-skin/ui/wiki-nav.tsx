import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { NAV_LABEL, navItems } from "#/widgets/wiki-skin/model/nav";

import { WikiNavItem } from "./wiki-nav-item";

const WikiNav = (): ReactNode => (
  <nav aria-label={NAV_LABEL} className="ms-auto text-sm">
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {pipe(
        navItems,
        Arr.map((item) => <WikiNavItem item={item} key={item.to} />),
      )}
    </ul>
  </nav>
);

export { WikiNav };
