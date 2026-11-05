import type { ReactNode } from "react";

import { ArticleMain } from "./article-main.tsx";
import type { Article } from "./article.ts";
import type { SloppediaConfig } from "./config.ts";
import type { Heading } from "./headings.ts";
import { SideToc } from "./side-toc.tsx";

const ArticleView = ({
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
  <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-6">
    <SideToc headings={headings} label={config.labels.toc} />
    <ArticleMain article={article} config={config} headings={headings}>
      {children}
    </ArticleMain>
  </div>
);

export { ArticleView };
