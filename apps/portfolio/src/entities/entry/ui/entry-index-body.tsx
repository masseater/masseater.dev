import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryIndexTitle } from "./entry-index-title";
import { EntryMeta } from "./entry-meta";

const EntryIndexBody = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="flex min-w-0 flex-col gap-3">
    <EntryIndexTitle entry={entry} />
    <p className="text-foreground/70 max-w-xl text-sm">{entry.description}</p>
    <EntryMeta entry={entry} />
  </div>
);

export { EntryIndexBody };
