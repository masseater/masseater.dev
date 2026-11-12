import type { ReactNode } from "react";

import { ScreenNav } from "./screen-nav.tsx";

const AppHeader = ({ children }: Readonly<{ children?: ReactNode }>): ReactNode => (
  <header className="flex h-12 shrink-0 items-center gap-6 border-b px-5">
    {children}
    <div className="grow" />
    <ScreenNav />
  </header>
);

export { AppHeader };
