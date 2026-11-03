import type { ReactNode } from "react";

import type { WikiCategory } from "#/pages/wiki-categories/model/categories";
import { countOf } from "#/pages/wiki-categories/model/copy";

const CategoryHeading = ({ category }: Readonly<{ category: WikiCategory }>): ReactNode => (
  <h2 className="border-wiki-divider border-b pb-1 font-serif text-lg">
    {category.name}
    <span className="text-wiki-subtle ms-2 font-sans text-xs">
      {countOf(category.entries.length)}
    </span>
  </h2>
);

export { CategoryHeading };
