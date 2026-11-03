import type { ReactNode } from "react";

import { ARTICLE_TAB, HISTORY_TAB, READ_TAB, SOURCE_TAB } from "#/pages/wiki-article/model/copy";
import { wiki } from "#/shared/config";

import { SelectedTab } from "./selected-tab";
import { TabLink } from "./tab-link";

const ArticleTabs = ({ slug }: Readonly<{ slug: string }>): ReactNode => (
  <div className="border-wiki-divider flex flex-wrap items-end justify-between gap-2 border-b text-sm">
    <SelectedTab label={ARTICLE_TAB} />
    <div className="flex flex-wrap">
      <SelectedTab label={READ_TAB} />
      <TabLink href={wiki.sourceOf(slug)} label={SOURCE_TAB} />
      <TabLink href={wiki.historyOf(slug)} label={HISTORY_TAB} />
    </div>
  </div>
);

export { ArticleTabs };
