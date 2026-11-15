import { Link } from "@tanstack/react-router";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { NAV_ICONS } from "#/shared/config/index.ts";
import type { PortalPath } from "#/shared/config/index.ts";

import { useSetMobileOpen } from "./sidebar-state";

const EXACT = { exact: true } as const;

const NEAR = { exact: false } as const;

const ACTIVE = { "data-active": true } as const;

const optionsOf = (to: PortalPath): typeof EXACT | typeof NEAR => {
  if (to === "/") {
    return EXACT;
  }
  return NEAR;
};

export const SidebarAnchor = ({
  label,
  to,
}: Readonly<{ label: string; to: PortalPath }>): ReactNode => {
  const setMobileOpen = useSetMobileOpen();
  const close = useCallback(() => {
    setMobileOpen(false);
  }, [setMobileOpen]);
  const Icon = NAV_ICONS[to];
  return (
    <Link
      activeOptions={optionsOf(to)}
      activeProps={ACTIVE}
      className="ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground flex h-9 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-all group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! focus-visible:ring-2 data-[active=true]:font-bold"
      data-slot="sidebar-menu-button"
      onClick={close}
      to={to}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
};
