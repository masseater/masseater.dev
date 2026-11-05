import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import type { Heading } from "./headings.ts";
import { SideTocNav } from "./side-toc-nav.tsx";

const SideToc = ({
  label,
  headings,
}: Readonly<{ label: string; headings: readonly Heading[] }>): ReactNode => (
  <aside className="hidden w-56 shrink-0 lg:block">
    <div className="sticky top-4">
      {Arr.isReadonlyArrayNonEmpty(headings) && <SideTocNav headings={headings} label={label} />}
    </div>
  </aside>
);

export { SideToc };
