import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { CategoryInfo } from "#/entities/entry";

const ACTIVE_PROPS = { className: "text-foreground" } as const;

const CategoryNavItem = ({ info }: Readonly<{ info: CategoryInfo }>): ReactNode => (
  <li>
    <Link
      activeProps={ACTIVE_PROPS}
      className="text-muted-foreground hover:text-foreground focus-visible:text-foreground transition-colors"
      params={info}
      to="/$category"
    >
      {info.title}
    </Link>
  </li>
);

export { CategoryNavItem };
