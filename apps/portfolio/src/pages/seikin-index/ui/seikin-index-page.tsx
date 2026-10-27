import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { articles } from "#/entities/technique";
import { DanceCredit } from "#/features/dance-stage";
import { INTRO, TITLE } from "#/pages/seikin-index/model/copy";
import { progressText } from "#/pages/seikin-index/model/progress";

import { ArticleSection } from "./article-section";

const SeikinIndexPage = (): ReactNode => (
  <div className="flex w-full max-w-5xl flex-col gap-12">
    <header className="flex flex-col gap-4">
      <h1 className="font-display text-4xl leading-tight font-light text-balance sm:text-6xl">
        {TITLE}
      </h1>
      <p className="leading-loose">{INTRO}</p>
      <p className="text-muted-foreground text-sm">{progressText}</p>
      <DanceCredit />
    </header>
    {pipe(
      articles,
      Arr.map((article) => <ArticleSection article={article} key={article} />),
    )}
  </div>
);

export { SeikinIndexPage };
