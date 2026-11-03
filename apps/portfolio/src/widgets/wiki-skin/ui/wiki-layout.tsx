import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { WikiHeader } from "./wiki-header";

const WikiLayout = (): ReactNode => (
  <div className="bg-wiki-paper text-wiki-text flex min-h-dvh flex-col font-sans">
    <WikiHeader />
    <Outlet />
  </div>
);

export { WikiLayout };
