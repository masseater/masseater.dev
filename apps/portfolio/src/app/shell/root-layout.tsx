import { SiteStage } from "@masseater.dev/ui";
import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

const RootLayout = (): ReactNode => (
  <SiteStage>
    <Outlet />
  </SiteStage>
);

export { RootLayout };
