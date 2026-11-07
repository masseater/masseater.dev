import type { ReactNode } from "react";

import { NavLink } from "./nav-link";

const NavLinks = (): ReactNode => (
  <nav className="flex gap-1" aria-label="一覧">
    <NavLink to="/videos" label="動画" />
    <NavLink to="/songs" label="曲" />
    <NavLink to="/people" label="担当者" />
  </nav>
);

export { NavLinks };
