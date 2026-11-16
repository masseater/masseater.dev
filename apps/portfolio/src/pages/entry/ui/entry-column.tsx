import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/index.ts";

import { ArticleHeader } from "./article-header.tsx";
import { EntryProse } from "./entry-prose.tsx";

export const EntryColumn = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="flex min-w-0 flex-1 flex-col gap-10">
    <ArticleHeader entry={entry} />
    <EntryProse entry={entry} />
  </div>
);
