import type { ReactNode } from "react";

import { targets } from "./config.ts";
import type { SloppediaConfig } from "./config.ts";
import { WikiLink } from "./wiki-link.tsx";

const CategoryItem = ({
  config,
  tag,
}: Readonly<{ config: SloppediaConfig; tag: string }>): ReactNode => (
  <li className="border-wiki-divider border-s px-2 first:border-s-0 first:ps-0">
    <WikiLink config={config} target={targets.category(tag)}>
      {tag}
    </WikiLink>
  </li>
);

export { CategoryItem };
