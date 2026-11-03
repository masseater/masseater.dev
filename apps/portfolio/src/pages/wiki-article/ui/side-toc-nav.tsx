import type { ReactNode } from "react";

import type { Heading } from "#/entities/entry";
import { TOC_LABEL } from "#/pages/wiki-article/model/copy";

import { TocList } from "./toc-list";

const SideTocNav = ({ headings }: Readonly<{ headings: readonly Heading[] }>): ReactNode => (
  <nav aria-label={TOC_LABEL} className="flex flex-col gap-2">
    <p className="border-wiki-divider border-b pb-1 text-sm font-bold">{TOC_LABEL}</p>
    <TocList headings={headings} />
  </nav>
);

export { SideTocNav };
