import type { ReactNode } from "react";

import { TargetActions } from "./target-actions.tsx";
import { TargetText } from "./target-text.tsx";

const TargetPane = (): ReactNode => (
  <div className="bg-muted/60 flex min-h-72 flex-col">
    <TargetText />
    <TargetActions />
  </div>
);

export { TargetPane };
