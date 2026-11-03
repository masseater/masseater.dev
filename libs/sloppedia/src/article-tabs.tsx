import type { ReactNode } from "react";

import type { SloppediaConfig } from "./config.ts";
import { TabLink } from "./tab-link.tsx";

const ArticleTabs = ({
  config,
  slug,
}: Readonly<{ config: SloppediaConfig; slug: string }>): ReactNode => (
  <div className="border-wiki-divider flex flex-wrap items-end justify-between gap-2 border-b text-sm">
    <span className="border-wiki-text text-wiki-text border-b-2 px-2 py-1">
      {config.labels.article}
    </span>
    <div className="flex flex-wrap">
      <TabLink hrefOf={config.sourceOf} label={config.labels.source} slug={slug} />
      <TabLink hrefOf={config.historyOf} label={config.labels.history} slug={slug} />
    </div>
  </div>
);

export { ArticleTabs };
