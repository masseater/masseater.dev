import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryMeta, EntryMeta, entryTitleTransition } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

const ArticleHeader = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <header className="flex flex-col gap-4">
    <Link className="stage-link self-start" params={entry} to="/$category">
      {categoryMeta[entry.category].title}
    </Link>
    <h1
      className="vt-attr font-display self-start text-4xl font-light sm:text-5xl"
      data-vt={entryTitleTransition(entry)}
    >
      {entry.title}
    </h1>
    <EntryMeta entry={entry} />
  </header>
);

export { ArticleHeader };
