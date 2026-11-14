import type { ReactNode } from "react";

import { useAsked } from "#/pages/interview/model/hooks";

import { PanelBody } from "./panel-body.tsx";
import { PanelTabList } from "./panel-tab-list.tsx";

const PanelTabs = (): ReactNode =>
  useAsked() && (
    <div className="flex min-h-0 flex-1 flex-col lg:hidden">
      <PanelTabList />
      <PanelBody />
    </div>
  );

export { PanelTabs };
