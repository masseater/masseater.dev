import type { ReactNode } from "react";

import { useRailDrag } from "./use-rail-drag.ts";

const LABEL = "ドラッグで幅を変える・クリックで開閉";

const SKIP_TAB = -1;

export const SidebarRail = (): ReactNode => (
  <button
    aria-label={LABEL}
    className="hover:after:bg-sidebar-border absolute inset-y-0 -right-4 z-20 hidden w-4 -translate-x-1/2 cursor-col-resize touch-none transition-all ease-linear group-data-[state=collapsed]:cursor-e-resize after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 sm:flex"
    data-slot="sidebar-rail"
    onPointerDown={useRailDrag()}
    tabIndex={SKIP_TAB}
    title={LABEL}
    type="button"
  />
);
