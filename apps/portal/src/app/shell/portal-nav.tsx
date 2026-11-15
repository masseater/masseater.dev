import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { NAV_GROUPS, TOP_GROUP } from "#/shared/config";
import { SidebarBrand } from "#/shared/ui/sidebar";

import { PortalNavGroup } from "./portal-nav-group";

export const PortalNav = (): ReactNode => (
  <>
    <SidebarBrand />
    <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden">
      {pipe(
        NAV_GROUPS,
        Arr.prepend(TOP_GROUP),
        Arr.map((group) => <PortalNavGroup group={group} key={group.label} />),
      )}
    </nav>
  </>
);
