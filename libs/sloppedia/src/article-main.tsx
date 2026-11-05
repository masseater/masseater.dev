import type { ReactNode } from "react";

import { ArticleContent } from "./article-content.tsx";
import { ArticleTabs } from "./article-tabs.tsx";
import type { Article } from "./article.ts";
import { CategoryBox } from "./category-box.tsx";
import type { SloppediaConfig } from "./config.ts";
import type { Heading } from "./headings.ts";
import { InlineToc } from "./inline-toc.tsx";
import { UpdatedNote } from "./updated-note.tsx";

const ArticleMain = ({
  config,
  article,
  headings,
  children,
}: Readonly<{
  config: SloppediaConfig;
  article: Article;
  headings: readonly Heading[];
  children: ReactNode;
}>): ReactNode => (
  <article className="min-w-0 flex-1">
    <h1 className="border-wiki-border border-b pb-1 font-serif text-3xl break-words">
      {article.title}
    </h1>
    <ArticleTabs config={config} slug={article.slug} />
    <InlineToc headings={headings} label={config.labels.toc} />
    <ArticleContent article={article}>{children}</ArticleContent>
    <CategoryBox config={config} tags={article.tags} />
    <UpdatedNote date={article.updated} label={config.labels.updated} locale={config.locale} />
  </article>
);

export { ArticleMain };
