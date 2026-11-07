import { SiteStage } from "@masseater.dev/ui";
import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

const StageLayout = (): ReactNode => (
  <SiteStage>
    <Outlet />
  </SiteStage>
);

export { StageLayout };
