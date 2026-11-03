import type { ReactNode } from "react";

import { WikiArticleLink } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

const IndexItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className="flex flex-col gap-0.5">
    <WikiArticleLink entry={entry} />
    <span className="text-wiki-subtle">{entry.description}</span>
  </li>
);

export { IndexItem };
