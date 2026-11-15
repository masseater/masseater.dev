import type { ReactNode } from "react";

import type { Article } from "./article.ts";
import { targets } from "./config.ts";
import type { SloppediaConfig } from "./config.ts";
import { WikiLink } from "./wiki-link.tsx";

export const ArticleLink = ({
  config,
  article,
}: Readonly<{ config: SloppediaConfig; article: Article }>): ReactNode => (
  <WikiLink config={config} target={targets.article(article.slug)}>
    {article.title}
  </WikiLink>
);
