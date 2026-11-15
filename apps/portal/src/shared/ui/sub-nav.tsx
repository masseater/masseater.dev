import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { SubNavItem } from "./sub-nav-item";
import type { SubNavEntry } from "./sub-nav-item";

const SubNav = ({
  items,
  label,
}: Readonly<{ items: readonly SubNavEntry[]; label: string }>): ReactNode => (
  <nav aria-label={label}>
    <ul className="font-display flex flex-wrap gap-2 text-xs tracking-widest uppercase">
      {pipe(
        items,
        Arr.map((item) => <SubNavItem item={item} key={item.label} />),
      )}
    </ul>
  </nav>
);

export { SubNav };
