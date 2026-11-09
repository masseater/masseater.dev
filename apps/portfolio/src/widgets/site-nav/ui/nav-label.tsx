import type { ReactNode } from "react";

import { sectionMeta } from "#/shared/config";
import type { Section } from "#/shared/config";

const NavLabel = ({
  active,
  section,
}: Readonly<{ active: boolean; section: Section }>): ReactNode => (
  <span className={`${sectionMeta[section].titleTransition} relative`}>
    {sectionMeta[section].title}
    {active && (
      <span
        aria-hidden
        className="vt-nav-indicator bg-foreground absolute inset-x-0 -bottom-2 h-px"
      />
    )}
  </span>
);

export { NavLabel };
