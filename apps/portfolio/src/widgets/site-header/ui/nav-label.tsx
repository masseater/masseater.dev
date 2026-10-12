import type { ReactNode } from "react";

import { categoryMeta } from "#/entities/entry";
import type { CategoryInfo } from "#/entities/entry";

const NavLabel = ({
  active,
  info,
}: Readonly<{ active: boolean; info: CategoryInfo }>): ReactNode => (
  <span className={`${categoryMeta[info.category].titleTransition} relative`}>
    {info.title}
    {active && (
      <span
        aria-hidden
        className="vt-nav-indicator bg-foreground absolute inset-x-0 -bottom-2 h-px"
      />
    )}
  </span>
);

export { NavLabel };
