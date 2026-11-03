import type { ReactNode } from "react";

import type { SloppediaConfig } from "./config.ts";
import { WikiHeader } from "./wiki-header.tsx";

const WikiLayout = ({
  config,
  children,
}: Readonly<{ config: SloppediaConfig; children: ReactNode }>): ReactNode => (
  <div className="bg-wiki-paper text-wiki-text flex min-h-dvh flex-col font-sans">
    <WikiHeader config={config} />
    {children}
  </div>
);

export { WikiLayout };
