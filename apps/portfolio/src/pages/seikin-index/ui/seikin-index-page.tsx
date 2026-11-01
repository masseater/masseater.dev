import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { articles } from "#/entities/technique";
import { DanceCredit } from "#/features/dance-stage";
import { TITLE } from "#/pages/seikin-index/model/copy";

import { ArticleSection } from "./article-section";

const SeikinIndexPage = (): ReactNode => (
  <div className="flex w-full max-w-5xl flex-col gap-12">
    <header className="flex flex-col gap-4">
      <h1 className="font-display text-4xl leading-tight font-light text-balance sm:text-6xl">
        {TITLE}
      </h1>
      <DanceCredit />
    </header>
    {pipe(
      articles,
      Arr.map((article) => <ArticleSection article={article} key={article} />),
    )}
  </div>
);

export { SeikinIndexPage };
