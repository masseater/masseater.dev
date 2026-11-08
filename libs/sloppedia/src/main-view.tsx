import type { ReactNode } from "react";

import type { Article } from "./article.ts";
import type { SloppediaConfig } from "./config.ts";
import { RandomBox } from "./random-box.tsx";
import { RecentBox } from "./recent-box.tsx";

const MainView = ({
  config,
  articles,
}: Readonly<{ config: SloppediaConfig; articles: readonly Article[] }>): ReactNode => (
  <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
    <section className="bg-wiki-surface border-wiki-divider border px-4 py-6 text-center">
      <h1 className="font-serif text-3xl">{config.labels.welcome(config.name)}</h1>
    </section>
    <div className="grid items-start gap-6 md:grid-cols-2">
      <RecentBox articles={articles} config={config} />
      <RandomBox articles={articles} config={config} />
    </div>
  </main>
);

export { MainView };
