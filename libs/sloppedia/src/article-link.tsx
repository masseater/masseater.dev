import type { ReactNode } from "react";

import type { Article } from "./article.ts";
import { targets } from "./config.ts";
import type { SloppediaConfig } from "./config.ts";
import { WikiLink } from "./wiki-link.tsx";

const ArticleLink = ({
  config,
  article,
}: Readonly<{ config: SloppediaConfig; article: Article }>): ReactNode => (
  <WikiLink config={config} target={targets.article(article.slug)}>
    {article.title}
  </WikiLink>
);

export { ArticleLink };
