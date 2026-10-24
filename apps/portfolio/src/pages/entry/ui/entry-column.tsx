import type { ReactNode } from "react";

import { categoryMeta } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

import { ArticleHeader } from "./article-header";
import { EntryProse } from "./entry-prose";
import { EntryReactions } from "./entry-reactions";

const EntryColumn = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="flex w-full max-w-3xl min-w-0 flex-col gap-10">
    <ArticleHeader entry={entry} />
    <EntryProse entry={entry} />
    {categoryMeta[entry.category].reactions && <EntryReactions direction="row" entry={entry} />}
  </div>
);

export { EntryColumn };
