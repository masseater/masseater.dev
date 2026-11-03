import type { ReactNode } from "react";

import { WikiBrand } from "./wiki-brand";
import { WikiNav } from "./wiki-nav";

const WikiHeader = (): ReactNode => (
  <header className="border-wiki-divider bg-wiki-paper border-b">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
      <WikiBrand />
      <WikiNav />
    </div>
  </header>
);

export { WikiHeader };
