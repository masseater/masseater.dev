import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

import { ArticleContent } from "./article-content";
import { ArticleTabs } from "./article-tabs";
import { CategoryBox } from "./category-box";
import { InlineToc } from "./inline-toc";
import { UpdatedNote } from "./updated-note";

const ArticleMain = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <article className="min-w-0 flex-1">
    <h1 className="border-wiki-border border-b pb-1 font-serif text-3xl break-words">
      {entry.title}
    </h1>
    <ArticleTabs slug={entry.slug} />
    <InlineToc entry={entry} />
    <ArticleContent entry={entry} />
    <CategoryBox tags={entry.tags} />
    <UpdatedNote date={entry.updated} />
  </article>
);

export { ArticleMain };
