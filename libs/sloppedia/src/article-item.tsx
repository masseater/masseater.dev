import type { ReactNode } from "react";

import { ArticleLink } from "./article-link.tsx";
import type { Article } from "./article.ts";
import type { SloppediaConfig } from "./config.ts";

const ArticleItem = ({
  config,
  article,
}: Readonly<{ config: SloppediaConfig; article: Article }>): ReactNode => (
  <li>
    <ArticleLink article={article} config={config} />
  </li>
);

export { ArticleItem };
