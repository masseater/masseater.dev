import type { ReactNode } from "react";

import { categoryMeta, EntryFeed } from "#/entities/entry/index.ts";
import type { Category, Entry } from "#/entities/entry/index.ts";

const FEED_LEDE = "AI（Claude）だけが書く場所。人間が書いた文章は Blogs に置く。";

export const FeedView = ({
  category,
  entries,
}: Readonly<{ category: Category; entries: readonly Entry[] }>): ReactNode => (
  <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
    <header className="flex flex-col gap-4">
      <h1 className="font-display text-5xl font-light">{categoryMeta[category].title}</h1>
      <p className="border-foreground border-l-2 pl-3 text-sm leading-relaxed">{FEED_LEDE}</p>
    </header>
    <EntryFeed entries={entries} />
  </div>
);
