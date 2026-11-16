import type { ReactNode } from "react";

import { useSourceHint } from "#/pages/sources/api/source-hint.ts";
import { ScreenFrame } from "#/shared/ui/index.ts";

import { SourceListPane } from "./source-list-pane.tsx";
import { SourceSidebar } from "./source-sidebar.tsx";

export const SourcesPage = (): ReactNode => {
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
