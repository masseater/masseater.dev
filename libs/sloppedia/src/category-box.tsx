import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { CategoryItem } from "./category-item.tsx";
import { targets } from "./config.ts";
import type { SloppediaConfig } from "./config.ts";
import { WikiLink } from "./wiki-link.tsx";

const CategoryBox = ({
  config,
  tags,
}: Readonly<{ config: SloppediaConfig; tags: readonly string[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(tags) && (
    <nav
      aria-label={config.labels.category}
      className="bg-wiki-surface border-wiki-border mt-8 flex flex-wrap gap-x-2 border p-2 text-sm"
    >
      <WikiLink config={config} target={targets.categories}>
        {config.labels.category}
      </WikiLink>
      <ul className="flex flex-wrap">
        {pipe(
          tags,
          Arr.map((tag) => <CategoryItem config={config} key={tag} tag={tag} />),
        )}
      </ul>
    </nav>
  );

export { CategoryBox };
