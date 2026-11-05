import type { ReactNode } from "react";

import { ArchitectureFlow } from "./architecture-flow";
import { ArchitectureLegend } from "./architecture-legend";

const Architecture = (): ReactNode => (
  <div className="architecture-figure w-full">
    <ArchitectureFlow />
    <ArchitectureLegend />
  </div>
);

export { Architecture };
