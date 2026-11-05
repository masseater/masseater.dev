import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { ArticleItem } from "./article-item.tsx";
import type { Article } from "./article.ts";
import type { WikiCategory } from "./categories.ts";
import { CategoryHeading } from "./category-heading.tsx";
import type { SloppediaConfig } from "./config.ts";

const CategorySection = ({
  config,
  category,
}: Readonly<{ config: SloppediaConfig; category: WikiCategory<Article> }>): ReactNode => (
  <section className="min-w-0 scroll-mt-4" id={category.name}>
    <CategoryHeading count={config.labels.count(category.articles.length)} name={category.name} />
    <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-sm">
      {pipe(
        category.articles,
        Arr.map((article) => <ArticleItem article={article} config={config} key={article.slug} />),
      )}
    </ul>
  </section>
);

export { CategorySection };
