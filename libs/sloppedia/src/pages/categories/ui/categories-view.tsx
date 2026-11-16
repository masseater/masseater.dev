import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Article } from "#/entities/article/index.ts";
import { categoriesOf } from "#/entities/article/index.ts";
import type { SloppediaConfig } from "#/shared/config/index.ts";
import { CategorySection } from "#/widgets/wiki/index.ts";

export const CategoriesView = ({
  config,
  articles,
}: Readonly<{ config: SloppediaConfig; articles: readonly Article[] }>): ReactNode => (
  <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
    <h1 className="border-wiki-border border-b pb-1 font-serif text-3xl">
      {config.labels.categories}
    </h1>
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {pipe(
        categoriesOf(articles),
        Arr.map((category) => (
          <CategorySection category={category} config={config} key={category.name} />
        )),
      )}
    </div>
  </main>
);
