import type { ReactNode } from "react";

import type { Pane as PaneName } from "#/features/run-playground/model/mount.ts";

import { Pane } from "./pane.tsx";

export const TabPane = ({
  name,
  tab,
  active,
}: Readonly<{ name: PaneName; tab: string; active: boolean }>): ReactNode => (
  <div aria-labelledby={tab} className="h-full min-h-0" hidden={!active} role="tabpanel">
    <Pane name={name} active />
  </div>
);
