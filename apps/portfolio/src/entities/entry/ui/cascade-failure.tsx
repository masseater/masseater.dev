import type { ReactNode } from "react";

import { CascadeFlow } from "./cascade-flow.tsx";
import { CascadeReplay } from "./cascade-replay.tsx";

export const CascadeFailure = (): ReactNode => (
  <div className="mx-auto w-full max-w-lg">
    <CascadeReplay />
    <CascadeFlow />
  </div>
);
