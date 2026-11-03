import type { ReactNode } from "react";

import { EntryBody } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

import { Infobox } from "./infobox";

const ArticleContent = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="mt-4 flow-root">
    <Infobox rows={entry.infobox} title={entry.title} />
    <div className="wiki-prose">
      <EntryBody entry={entry} />
    </div>
  </div>
);

export { ArticleContent };
