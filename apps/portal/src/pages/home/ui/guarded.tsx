import { CatchBoundary } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LoadFailed } from "./load-failed";

const KEY = "home";

const resetKey = (): string => KEY;

export const Guarded = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <CatchBoundary errorComponent={LoadFailed} getResetKey={resetKey}>
    {children}
  </CatchBoundary>
);
