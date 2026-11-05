import type { ReactNode } from "react";

import type { SloppediaConfig, Target } from "./config.ts";
import { WikiLink } from "./wiki-link.tsx";

const WikiNavItem = ({
  config,
  target,
  label,
}: Readonly<{ config: SloppediaConfig; target: Target; label: string }>): ReactNode => (
  <li>
    <WikiLink config={config} target={target}>
      {label}
    </WikiLink>
  </li>
);

export { WikiNavItem };
