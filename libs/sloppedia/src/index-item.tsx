import type { ReactNode } from "react";

import { ArticleLink } from "./article-link.tsx";
import type { Article } from "./article.ts";
import type { SloppediaConfig } from "./config.ts";

const IndexItem = ({
  config,
  article,
}: Readonly<{ config: SloppediaConfig; article: Article }>): ReactNode => (
  <li className="flex flex-col gap-0.5">
    <ArticleLink article={article} config={config} />
    <span className="text-wiki-subtle">{article.description}</span>
  </li>
);

export { IndexItem };
