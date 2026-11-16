import type { ReactNode } from "react";

import type { Article, Heading } from "#/entities/article/index.ts";
import type { SloppediaConfig } from "#/shared/config/index.ts";
import { ArticleMain, SideToc } from "#/widgets/wiki/index.ts";

export const ArticleView = ({
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
