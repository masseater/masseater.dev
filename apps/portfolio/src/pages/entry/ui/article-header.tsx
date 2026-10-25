import { nameTransition } from "@masseater.dev/ui";
import type { ReactNode } from "react";

import { EntryMeta, entryTitleTransition } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

const ArticleHeader = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <header className="flex flex-col gap-6">
    <h1
      className="vt-entry entry-title-timeline font-display self-start text-4xl leading-tight font-light text-balance sm:text-6xl"
      data-vt={entryTitleTransition(entry)}
      ref={nameTransition}
    >
      {entry.title}
    </h1>
    <EntryMeta entry={entry} />
  </header>
);

export { ArticleHeader };
