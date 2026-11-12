import type { ReactNode } from "react";

import { ScreenFrame } from "#/shared/ui";

import { SourceListPane } from "./source-list-pane.tsx";
import { SourceSidebar } from "./source-sidebar.tsx";

const SourcesPage = (): ReactNode => (
  <ScreenFrame>
    <div className="flex min-h-0 grow">
      <SourceListPane />
      <SourceSidebar />
    </div>
  </ScreenFrame>
);

export { SourcesPage };
