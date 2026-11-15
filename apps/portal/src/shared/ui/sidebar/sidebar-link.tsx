import type { ReactNode } from "react";

import type { PortalPath } from "#/shared/config/index.ts";

import { SidebarAnchor } from "./sidebar-anchor";
import { SidebarTooltip } from "./sidebar-tooltip";

export const SidebarLink = ({
  label,
  to,
}: Readonly<{ label: string; to: PortalPath }>): ReactNode => (
  <li className="group/menu-item relative" data-slot="sidebar-menu-item">
    <SidebarTooltip label={label}>
      <SidebarAnchor label={label} to={to} />
    </SidebarTooltip>
  </li>
);
