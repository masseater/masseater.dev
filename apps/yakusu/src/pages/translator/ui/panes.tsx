import type { ReactNode } from "react";

import { SourcePane } from "./source-pane.tsx";
import { TargetPane } from "./target-pane.tsx";

const Panes = (): ReactNode => (
  <div className="grid grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
    <SourcePane />
    <TargetPane />
  </div>
);

export { Panes };
