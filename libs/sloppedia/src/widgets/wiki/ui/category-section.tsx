import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Article, WikiCategory } from "#/entities/article/index.ts";
import type { SloppediaConfig } from "#/shared/config/index.ts";

import { ArticleItem } from "./article-item.tsx";
import { CategoryHeading } from "./category-heading.tsx";

export const CategorySection = ({
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
