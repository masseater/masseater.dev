import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { WikiCategory } from "#/pages/wiki-categories/model/categories";
import { TITLE } from "#/pages/wiki-categories/model/copy";

import { CategorySection } from "./category-section";

const CategoriesView = ({
  categories,
}: Readonly<{ categories: readonly WikiCategory[] }>): ReactNode => (
  <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
    <h1 className="border-wiki-border border-b pb-1 font-serif text-3xl">{TITLE}</h1>
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {pipe(
        categories,
        Arr.map((category) => <CategorySection category={category} key={category.name} />),
      )}
    </div>
  </main>
);

export { CategoriesView };
