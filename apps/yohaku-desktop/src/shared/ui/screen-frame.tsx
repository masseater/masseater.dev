import type { ReactNode } from "react";

import { AppHeader } from "./app-header.tsx";

export const ScreenFrame = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="flex h-screen flex-col">
    <AppHeader />
    {children}
  </div>
);
