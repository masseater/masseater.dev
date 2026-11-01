import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { CategoryInfo } from "#/entities/entry";
import type { Direction } from "#/widgets/site-nav/model/direction";

import { NavLabel } from "./nav-label";

const LINK_CLASS = {
  row: "px-2 py-3",
  header: "px-1.5 py-3 max-sm:text-xs max-sm:tracking-wider sm:px-2",
} as const;

const ACTIVE_PROPS = { className: "text-foreground" } as const;

const CategoryLink = ({
  direction,
  info,
}: Readonly<{ direction: Direction; info: CategoryInfo }>): ReactNode => (
  <li>
    <Link
      activeProps={ACTIVE_PROPS}
      className={`stage-link ${LINK_CLASS[direction]}`}
      params={info}
      to="/$category"
    >
      {({ isActive }) => <NavLabel active={isActive} info={info} />}
    </Link>
  </li>
);

export { CategoryLink };
