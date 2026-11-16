import type { ReactNode } from "react";

import { playground } from "#/shared/config/index.ts";

import { Pane } from "./pane.tsx";
import { PanelBody } from "./panel-body.tsx";
import { PanelLabel } from "./panel-label.tsx";
import { Panel } from "./panel.tsx";

export const GeneratedPanel = (): ReactNode => (
  <Panel className="h-72 lg:h-auto">
    <PanelLabel label={playground.panes.generated} note={playground.generatedNote} />
    <PanelBody>
      <Pane name="generated" active />
    </PanelBody>
  </Panel>
);
