import type { ReactNode } from "react";

import type { Heading } from "./headings.ts";
import { TocList } from "./toc-list.tsx";

const SideTocNav = ({
  label,
  headings,
}: Readonly<{ label: string; headings: readonly Heading[] }>): ReactNode => (
  <nav aria-label={label} className="flex flex-col gap-2">
    <p className="border-wiki-divider border-b pb-1 text-sm font-bold">{label}</p>
    <TocList headings={headings} />
  </nav>
);

export { SideTocNav };
