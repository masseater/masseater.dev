import type { ReactNode } from "react";

import { AppHeader } from "./app-header.tsx";

const ScreenFrame = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="flex h-screen flex-col">
    <AppHeader />
    {children}
  </div>
);

export { ScreenFrame };
