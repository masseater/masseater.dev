import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { CategoryInfo } from "#/entities/entry";

import { NavLabel } from "./nav-label";

const ACTIVE_PROPS = { className: "text-foreground" } as const;

const CategoryLink = ({ info }: Readonly<{ info: CategoryInfo }>): ReactNode => (
  <li>
    <Link activeProps={ACTIVE_PROPS} className="stage-link px-2 py-3" params={info} to="/$category">
      {({ isActive }) => <NavLabel active={isActive} info={info} />}
    </Link>
  </li>
);

export { CategoryLink };
