import type { ReactNode } from "react";

import { categoryInfos } from "#/entities/entry";

import { CategoryLink } from "./category-link";

const CategoryLinkRow = (): ReactNode => (
  <ul className="flex flex-wrap justify-center gap-x-4">
    {categoryInfos.map((info) => (
      <CategoryLink info={info} key={info.category} />
    ))}
  </ul>
);

export { CategoryLinkRow };
