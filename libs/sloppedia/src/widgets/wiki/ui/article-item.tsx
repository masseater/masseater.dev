import type { ReactNode } from "react";

import type { Article } from "#/entities/article/index.ts";
import type { SloppediaConfig } from "#/shared/config/index.ts";

import { ArticleLink } from "./article-link.tsx";

export const ArticleItem = ({
  config,
  article,
}: Readonly<{ config: SloppediaConfig; article: Article }>): ReactNode => (
  <li>
    <ArticleLink article={article} config={config} />
  </li>
);
