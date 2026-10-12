import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryMeta } from "#/entities/entry";
import type { CategoryInfo } from "#/entities/entry";

const ACTIVE_PROPS = { className: "text-foreground underline" } as const;

const CategoryNavItem = ({ info }: Readonly<{ info: CategoryInfo }>): ReactNode => (
  <li>
    <Link activeProps={ACTIVE_PROPS} className="stage-link py-3" params={info} to="/$category">
      <span className={categoryMeta[info.category].titleTransition}>{info.title}</span>
    </Link>
  </li>
);

export { CategoryNavItem };
