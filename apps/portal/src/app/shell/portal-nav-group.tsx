import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { NavGroup } from "#/shared/config/index.ts";
import { SidebarGroup, SidebarLink } from "#/shared/ui/sidebar/index.ts";

export const PortalNavGroup = ({ group }: Readonly<{ group: NavGroup }>): ReactNode => (
  <SidebarGroup label={group.label}>
    {pipe(
      group.items,
      Arr.map((item) => <SidebarLink key={item.to} label={item.label} to={item.to} />),
    )}
  </SidebarGroup>
);
