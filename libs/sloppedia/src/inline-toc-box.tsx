import type { ReactNode } from "react";

import type { Heading } from "./headings.ts";
import { TocList } from "./toc-list.tsx";

const InlineTocBox = ({
  label,
  headings,
}: Readonly<{ label: string; headings: readonly Heading[] }>): ReactNode => (
  <details className="bg-wiki-surface border-wiki-border mt-4 border p-3 lg:hidden">
    <summary className="cursor-pointer text-sm font-bold">{label}</summary>
    <nav aria-label={label} className="mt-2">
      <TocList headings={headings} />
    </nav>
  </details>
);

export { InlineTocBox };
