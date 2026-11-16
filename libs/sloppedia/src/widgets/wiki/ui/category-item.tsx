import type { ReactNode } from "react";

import { targets } from "#/shared/config/index.ts";
import type { SloppediaConfig } from "#/shared/config/index.ts";

import { WikiLink } from "./wiki-link.tsx";

export const CategoryItem = ({
  config,
  tag,
}: Readonly<{ config: SloppediaConfig; tag: string }>): ReactNode => (
  <li className="border-wiki-divider border-s px-2 first:border-s-0 first:ps-0">
    <WikiLink config={config} target={targets.category(tag)}>
      {tag}
    </WikiLink>
  </li>
);
