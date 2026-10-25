import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

import { ArticleHeader } from "./article-header";
import { EntryProse } from "./entry-prose";
import { EntryReactions } from "./entry-reactions";

const EntryColumn = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="flex min-w-0 flex-1 flex-col gap-10">
    <ArticleHeader entry={entry} />
    <EntryProse entry={entry} />
    <EntryReactions direction="row" entry={entry} />
  </div>
);

export { EntryColumn };
