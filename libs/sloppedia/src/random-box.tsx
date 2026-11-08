import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Article } from "./article.ts";
import { randomOf } from "./categories.ts";
import type { SloppediaConfig } from "./config.ts";
import { IndexItem } from "./index-item.tsx";
import { MainBox } from "./main-box.tsx";

const RandomBox = ({
  config,
  articles,
}: Readonly<{ config: SloppediaConfig; articles: readonly Article[] }>): ReactNode => (
  <MainBox title={config.labels.random}>
    <ul className="flex flex-col gap-3 text-sm">
      {pipe(
        randomOf(articles),
        Arr.map((article) => <IndexItem article={article} config={config} key={article.slug} />),
      )}
    </ul>
  </MainBox>
);

export { RandomBox };
