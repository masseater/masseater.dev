import type { ReactNode } from "react";
import { useId } from "react";

import { useAsked, usePanel } from "#/entities/interview/index.ts";

import { PanelBody } from "./panel-body.tsx";
import { PanelTabList } from "./panel-tab-list.tsx";

export const PanelTabs = (): ReactNode => {
  const tabsId = useId();
  const panel = usePanel();
  return (
    useAsked() && (
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <PanelTabList tabsId={tabsId} />
        <div
          role="tabpanel"
          aria-labelledby={`${tabsId}-${panel}`}
          className="flex min-h-0 flex-1 flex-col"
        >
          <PanelBody />
        </div>
      </div>
    )
  );
};
