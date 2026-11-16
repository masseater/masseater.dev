import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Article } from "#/entities/article/index.ts";
import { recentOf } from "#/entities/article/index.ts";
import type { SloppediaConfig } from "#/shared/config/index.ts";

import { ArticleItem } from "./article-item.tsx";
import { MainBox } from "./main-box.tsx";

export const RecentBox = ({
  config,
  articles,
}: Readonly<{ config: SloppediaConfig; articles: readonly Article[] }>): ReactNode => (
  <MainBox title={config.labels.recent}>
    <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
      {pipe(
        recentOf(articles),
        Arr.map((article) => <ArticleItem article={article} config={config} key={article.slug} />),
      )}
    </ul>
  </MainBox>
);
