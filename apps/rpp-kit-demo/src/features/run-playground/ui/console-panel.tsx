import type { ReactNode } from "react";

import { playground } from "#/shared/config/index.ts";

import { ConsoleView } from "./console-view.tsx";
import { PanelBody } from "./panel-body.tsx";
import { PanelLabel } from "./panel-label.tsx";
import { Panel } from "./panel.tsx";

export const ConsolePanel = (): ReactNode => (
  <Panel className="max-h-96">
    <PanelLabel label={playground.panes.console} />
    <PanelBody>
      <ConsoleView />
    </PanelBody>
  </Panel>
);
