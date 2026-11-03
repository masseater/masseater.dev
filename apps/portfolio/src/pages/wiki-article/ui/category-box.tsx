import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { CATEGORY_LABEL, CATEGORY_SEPARATOR } from "#/pages/wiki-article/model/copy";

import { CategoryItem } from "./category-item";

const CategoryBox = ({ tags }: Readonly<{ tags: readonly string[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(tags) && (
    <nav
      aria-label={CATEGORY_LABEL}
      className="bg-wiki-surface border-wiki-border mt-8 flex flex-wrap gap-x-2 border p-2 text-sm"
    >
      <Link className="text-wiki-link hover:underline" to="/sloppedia/categories">
        {CATEGORY_LABEL}
      </Link>
      <span aria-hidden>{CATEGORY_SEPARATOR}</span>
      <ul className="flex flex-wrap">
        {pipe(
          tags,
          Arr.map((tag) => <CategoryItem key={tag} tag={tag} />),
        )}
      </ul>
    </nav>
  );

export { CategoryBox };
