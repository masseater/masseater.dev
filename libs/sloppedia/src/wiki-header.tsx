import type { ReactNode } from "react";

import type { SloppediaConfig } from "./config.ts";
import { WikiBrand } from "./wiki-brand.tsx";
import { WikiNav } from "./wiki-nav.tsx";

const WikiHeader = ({ config }: Readonly<{ config: SloppediaConfig }>): ReactNode => (
  <header className="border-wiki-divider bg-wiki-paper border-b">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
      <WikiBrand config={config} />
      <WikiNav config={config} />
    </div>
  </header>
);

export { WikiHeader };
