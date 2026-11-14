import type { ReactNode } from "react";

import { useSourceHint } from "#/pages/sources/api/source-hint.ts";
import { ScreenFrame } from "#/shared/ui";

import { SourceListPane } from "./source-list-pane.tsx";
import { SourceSidebar } from "./source-sidebar.tsx";

const SourcesPage = (): ReactNode => {
  useSourceHint();
  return (
    <ScreenFrame>
      <div className="flex min-h-0 grow">
        <SourceListPane />
        <SourceSidebar />
      </div>
    </ScreenFrame>
  );
};

export { SourcesPage };
