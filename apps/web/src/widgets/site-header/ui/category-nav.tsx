import type { ReactNode } from "react";

import { categoryInfos } from "#/entities/entry";

import { CategoryNavItem } from "./category-nav-item";

const LABEL = "カテゴリ";

const CategoryNav = (): ReactNode => (
  <nav aria-label={LABEL}>
    <ul className="flex flex-wrap gap-4 text-sm">
      {categoryInfos.map((info) => (
        <CategoryNavItem info={info} key={info.category} />
      ))}
    </ul>
  </nav>
);

export { CategoryNav };
