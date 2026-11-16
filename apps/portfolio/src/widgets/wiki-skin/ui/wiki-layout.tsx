import { WikiLayout as SloppediaLayout } from "@masseater.dev/sloppedia";
import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { wiki } from "#/shared/wiki";

export const WikiLayout = (): ReactNode => (
  <SloppediaLayout config={wiki}>
    <Outlet />
  </SloppediaLayout>
);
