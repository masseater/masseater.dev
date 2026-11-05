import type { ReactNode } from "react";

import { CascadeFlow } from "./cascade-flow";
import { CascadeReplay } from "./cascade-replay";

const CascadeFailure = (): ReactNode => (
  <div className="mx-auto w-full max-w-lg">
    <CascadeReplay />
    <CascadeFlow />
  </div>
);

export { CascadeFailure };
