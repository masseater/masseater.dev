import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const ALL = {};
const ACTIVE = { className: "bg-secondary text-foreground" };

const NavLink = ({
  to,
  label,
}: Readonly<{ to: "/videos" | "/songs" | "/people"; label: string }>): ReactNode => (
  <Link
    to={to}
    search={ALL}
    className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full px-3 py-1.5 text-sm font-bold transition-colors"
    activeProps={ACTIVE}
  >
    {label}
  </Link>
);

export { NavLink };
