import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { PortalPath } from "#/shared/config";

export const PortalNavItem = ({
  active,
  label,
  to,
}: Readonly<{ active: boolean; label: string; to: PortalPath }>): ReactNode => (
  <li>
    <Link
      aria-current={active && "page"}
      className="stage-link aria-[current=page]:text-foreground px-1 py-3 underline-offset-8 aria-[current=page]:underline max-sm:text-xs max-sm:tracking-normal sm:px-2"
      to={to}
    >
      {label}
    </Link>
  </li>
);
