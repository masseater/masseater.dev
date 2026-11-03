import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { NavItem } from "#/widgets/wiki-skin/model/nav";

const WikiNavItem = ({ item }: Readonly<{ item: NavItem }>): ReactNode => (
  <li>
    <Link className="text-wiki-link hover:underline" to={item.to}>
      {item.label}
    </Link>
  </li>
);

export { WikiNavItem };
