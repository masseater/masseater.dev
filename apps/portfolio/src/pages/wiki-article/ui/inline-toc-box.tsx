import type { ReactNode } from "react";

import type { Heading } from "#/entities/entry";
import { TOC_LABEL } from "#/pages/wiki-article/model/copy";

import { TocList } from "./toc-list";

const InlineTocBox = ({ headings }: Readonly<{ headings: readonly Heading[] }>): ReactNode => (
  <details className="bg-wiki-surface border-wiki-border mt-4 border p-3 lg:hidden">
    <summary className="cursor-pointer text-sm font-bold">{TOC_LABEL}</summary>
    <nav aria-label={TOC_LABEL} className="mt-2">
      <TocList headings={headings} />
    </nav>
  </details>
);

export { InlineTocBox };
