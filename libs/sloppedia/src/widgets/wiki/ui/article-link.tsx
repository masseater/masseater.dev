import type { ReactNode } from "react";

import type { Article } from "#/entities/article/index.ts";
import { targets } from "#/shared/config/index.ts";
import type { SloppediaConfig } from "#/shared/config/index.ts";

import { WikiLink } from "./wiki-link.tsx";

export const ArticleLink = ({
  config,
  article,
}: Readonly<{ config: SloppediaConfig; article: Article }>): ReactNode => (
  <WikiLink config={config} target={targets.article(article.slug)}>
    {article.title}
  </WikiLink>
);
