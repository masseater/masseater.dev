import type { ReactNode } from "react";

import type { SloppediaConfig } from "#/shared/config/index.ts";

import { WikiHeader } from "./wiki-header.tsx";

export const WikiLayout = ({
  config,
  children,
}: Readonly<{ config: SloppediaConfig; children: ReactNode }>): ReactNode => (
  <div className="bg-wiki-paper text-wiki-text flex min-h-dvh flex-col font-sans">
    <WikiHeader config={config} />
    {children}
  </div>
);
