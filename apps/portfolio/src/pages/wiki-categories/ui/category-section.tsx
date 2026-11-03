import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { WikiCategory } from "#/pages/wiki-categories/model/categories";

import { CategoryArticle } from "./category-article";
import { CategoryHeading } from "./category-heading";

const CategorySection = ({ category }: Readonly<{ category: WikiCategory }>): ReactNode => (
  <section className="min-w-0 scroll-mt-4" id={category.name}>
    <CategoryHeading category={category} />
    <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-sm">
      {pipe(
        category.entries,
        Arr.map((entry) => <CategoryArticle entry={entry} key={entry.slug} />),
      )}
    </ul>
  </section>
);

export { CategorySection };
