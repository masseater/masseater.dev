import type { ReactNode } from "react";

import { HeaderBar } from "./header-bar";

const SiteHeader = (): ReactNode => (
  <header className="bg-background/85 sticky top-0 z-10 border-b backdrop-blur">
    <HeaderBar />
  </header>
);

export { SiteHeader };
