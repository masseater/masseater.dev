import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { CategoryInfo } from "#/entities/entry";

const ACTIVE_PROPS = { className: "text-foreground underline" } as const;

const CategoryNavItem = ({ info }: Readonly<{ info: CategoryInfo }>): ReactNode => (
  <li>
    <Link activeProps={ACTIVE_PROPS} className="stage-link py-3" params={info} to="/$category">
      {info.title}
    </Link>
  </li>
);

export { CategoryNavItem };
