import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { ArticleItem } from "./article-item.tsx";
import type { Article } from "./article.ts";
import { recentOf } from "./categories.ts";
import type { SloppediaConfig } from "./config.ts";
import { MainBox } from "./main-box.tsx";

const RecentBox = ({
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

export { RecentBox };
