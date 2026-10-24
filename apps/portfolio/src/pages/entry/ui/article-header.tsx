import { nameTransition } from "@masseater.dev/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryMeta, EntryMeta, entryTitleTransition } from "#/entities/entry";
import type { Entry } from "#/entities/entry";
import { Arrow } from "#/shared/ui";

const ArticleHeader = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <header className="flex flex-col gap-6">
    <Link className="stage-link group flex gap-2 self-start" params={entry} to="/$category">
      <Arrow variant="back" />
      {categoryMeta[entry.category].title}
    </Link>
    <h1
      className="vt-entry font-display self-start text-4xl leading-tight font-light text-balance sm:text-6xl"
      data-vt={entryTitleTransition(entry)}
      ref={nameTransition}
    >
      {entry.title}
    </h1>
    <EntryMeta entry={entry} />
  </header>
);

export { ArticleHeader };
