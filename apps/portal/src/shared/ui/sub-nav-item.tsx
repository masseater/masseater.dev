import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { PortalPath } from "#/shared/config";

type SubNavEntry = Readonly<{ label: string; to: PortalPath }>;

const ACTIVE = { className: "ring-foreground/60 text-foreground" } as const;

const ACTIVE_OPTIONS = { exact: true } as const;

const SubNavItem = ({ item }: Readonly<{ item: SubNavEntry }>): ReactNode => (
  <li>
    <Link
      activeOptions={ACTIVE_OPTIONS}
      activeProps={ACTIVE}
      className="ring-foreground/10 text-foreground/60 hover:text-foreground inline-block rounded-full px-3 py-1 ring-1 transition-colors"
      to={item.to}
    >
      {item.label}
    </Link>
  </li>
);

export { SubNavItem };
export type { SubNavEntry };
