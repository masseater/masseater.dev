import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { WikiLayout as SloppediaLayout } from "sloppedia";

import { wiki } from "#/shared/wiki";

const WikiLayout = (): ReactNode => (
  <SloppediaLayout config={wiki}>
    <Outlet />
  </SloppediaLayout>
);

export { WikiLayout };
