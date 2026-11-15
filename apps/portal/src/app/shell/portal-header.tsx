import type { ReactNode } from "react";

import { SearchField } from "#/shared/ui/index.ts";
import { SidebarTrigger } from "#/shared/ui/sidebar/index.ts";

import { PortalBreadcrumb } from "./portal-breadcrumb";

const SEARCH = "記録・メモ・スライドを検索";

export const PortalHeader = (): ReactNode => (
  <header className="bg-background/95 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
    <SidebarTrigger />
    <div aria-hidden className="bg-border mr-1 h-4 w-px" />
    <PortalBreadcrumb />
    <div className="ml-auto hidden w-80 sm:block">
      <SearchField action="/search" label={SEARCH} value="" />
    </div>
  </header>
);
